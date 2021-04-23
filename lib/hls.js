const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const events = require("events");

const ffmpeg = require("fluent-ffmpeg");
const m3u8Parser = require("m3u8-parser");
const fetch = require("node-fetch");
const Promise = require("bluebird");

const globalConfig = require("./configuration.json");
const fetchOptions = { headers: { "User-Agent": globalConfig.headers["User-Agent"] } };

const defaultDownloadParams = { 
    name: null,
    chunksFolder: path.resolve("hls"),
    delete: true
};

class hls extends events {
    constructor () {
        super();
    }

    async parse (link) {
        const data = await fetch(link);
        const playlist = await data.text();
        
        const parser = new m3u8Parser.Parser();
        parser.push(playlist);
        parser.end();

        const { segments } = parser.manifest;

        let cacheKey = null;
        let chunks = [];
        for (const segment of segments) {
            if (!cacheKey) {
                if (segment.key) {
                    const keyResponse = await fetch(segment.key.uri);
                    cacheKey = await keyResponse.text();
                }
            }

            const name = segment.uri.match(/(.*?)\?/)[1];
            chunks = [...chunks, {
                name,
                url: link.match(/(.*?)index/)[1] + name,
                method: segment.key ? segment.key.method : "NONE",
                key: cacheKey
            }];
        }

        return chunks;
    }

    async decrypt (chunk) {
        try {
            if (chunk.method === "AES-128") {
                const response = await fetch(chunk.url, fetchOptions);
                const cipheredData = await response.buffer();
                const iv = cipheredData.slice(0, 16);
                const decipher = crypto.createDecipheriv("aes-128-cbc", chunk.key, iv);
                decipher.setAutoPadding(0);
        
                return Buffer.concat([
                    decipher.update(cipheredData), 
                    decipher.final()
                ]);
            } else {
                const response = await fetch(chunk.url, fetchOptions);
                return await response.buffer();
            }
        } catch (error) {
            if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
                return await this.decrypt(chunk);
            }
        }
    }

    /**
     * 
     * @param {string} link 
     * @param {string} ffmpegPath 
     * @param {string} outputFolder 
     * @param {object} params 
     * @returns 
     */
    async download (link, ffmpegPath, outputFolder, params = {}) {
        if (!link || typeof link !== "string") {
            throw new Error("Invalid link");
        }
        
        if (!fs.existsSync(ffmpegPath)) {
            throw new Error("ffmpeg executable not found");
        }

        params = {
            defaultDownloadParams,
            ...params
        };

        if (!fs.existsSync(params.chunksFolder)) {
            fs.mkdirSync(params.chunksFolder);
        }

        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder);
        }
        
        ffmpeg.setFfmpegPath(ffmpegPath);
        let chunks = await this.parse(link);

        let downloaded = 0;
        await Promise.map(chunks, async chunk => {
            const data = await this.decrypt(chunk);

            if (data) {
                const filePath = path.join(params.chunksFolder, chunk.name);
                fs.writeFileSync(filePath, data, { encoding: "binary" });
                chunk.url = filePath;
                downloaded++;
            }

            this.emit("progress", {
                downloaded,
                total: chunks.length,
                procent: (downloaded / chunks.length) * 100
            });
        }, { concurrency: 5 });

        if (!params.name) {
            params.name = chunks[0].name;
        }

        const output = path.join(outputFolder, (params.name + ".mp3").replace(".ts.mp3", ".mp3"));
        const listFile = path.join(params.chunksFolder, `list_${chunks[0].name}.txt`);
        fs.writeFileSync(listFile, chunks.map(i => `file '${i.url}'`).join("\n"));

        return new Promise(resolve => {
            this.emit("processing");

            ffmpeg().on("end", () => {
                chunks.forEach(({ url }) => fs.unlinkSync(url));

                if (params.delete) { // resolve buffer and delete file
                    resolve(fs.readFileSync(output));
                    fs.unlinkSync(output);
                } else { // do not delete file and resolve output path instead
                    resolve(output);
                }
                
                chunks = null;
                fs.unlinkSync(listFile);
            }).input(listFile).inputOptions(["-f concat", "-safe 0"]).save(output);
        });
    }
}

module.exports = hls;