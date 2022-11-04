const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const events = require("events");
const filenamify = require("filenamify");

const ffmpeg = require("fluent-ffmpeg");
const m3u8Parser = require("m3u8-parser");
const fetch = require("node-fetch");
const fetchProgress = require("node-fetch-progress");
const Promise = require("bluebird");

const globalConfig = require("./configuration.json");
const fetchOptions = { headers: { "User-Agent": globalConfig.headers["User-Agent"] } };

const defaultDownloadParams = {
    name: null,
    chunksFolder: path.resolve(`hls_${Math.floor(Math.random() * 1000)}`),
    delete: true,
    concurrency: 5
};

const ffmpegConfig = {
    format: "concat",
    options: ["-safe 0"],
    codec: "libmp3lame",
    bitrate: 320
};

class hls extends events {
    constructor (params = {}) {
        super();

        if (!params.ffmpegPath) {
            throw new Error("You must to specify ffmpeg executable path");
        } else {
            if (!fs.existsSync(params.ffmpegPath)) {
                throw new Error("ffmpeg executable not found");
            }
        }

        ffmpeg.setFfmpegPath(params.ffmpegPath);
        this.params = {
            ...defaultDownloadParams,
            ...params
        };

        this.key = null;
        this.root = null;
    }

    async parse (link) {
        const data = await fetch(link);
        const parser = new m3u8Parser.Parser();

        parser.push(await data.text());
        parser.end();

        const chunks = [];

        for (const segment of parser.manifest.segments) {
            if (!this.key) {
                if (segment.key) {
                    const keyResponse = await fetch(segment.key.uri);
                    this.key = await keyResponse.text();
                    this.root = segment.key.uri.match(/(.*?)\/key/)[1];
                }
            }

            const split = link.split("/");
            const file = /(.*?)\?extra/.test(segment.uri)
                ? segment.uri.match(/(.*?)\?extra/)[1]
                : segment.uri;

            const salt = (Math.random() + 1).toString(36).substring(7);
            chunks.push({
                name: `${salt}_${split[4]}_${split[5]}_${file}`,
                url: `${this.root}/${file}`,
                method: segment.key ? segment.key.method : "NONE"
            });
        }

        return chunks;
    }

    async decrypt (chunk) {
        try {
            if (chunk.method === "AES-128") {
                const response = await fetch(chunk.url, fetchOptions);
                const cipheredData = await response.buffer();
                const iv = cipheredData.slice(0, 16);
                const decipher = crypto.createDecipheriv("aes-128-cbc", this.key, iv);
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

    async downloadM3U8 (link, outputFolder) {
        let chunks = await this.parse(link);

        if (chunks.length === 0) {
            throw new Error("Chunks are empty");
        }

        let downloaded = 0;
        await Promise.map(chunks, async chunk => {
            const data = await this.decrypt(chunk);

            if (data) {
                const chunkPath = path.join(this.params.chunksFolder, chunk.name);

                chunk.url = chunkPath;
                fs.writeFileSync(chunkPath, data, { encoding: "binary" });

                downloaded++;
            }

            this.emit("progress", { percent: (downloaded / chunks.length) * 100 });
        }, { concurrency: this.params.concurrency });

        this.emit("processing");
        if (!this.params.name) {
            this.params.name = chunks[0].name;
        }

        this.params.name = filenamify(this.params.name);

        const output = path.join(outputFolder, (this.params.name + ".mp3").replace(".ts.mp3", ".mp3"));

        const listName = filenamify("list_" + this.params.name.replaceAll(" ", "_") + ".txt");
        const listFile = path.join(this.params.chunksFolder, listName);

        const lines = "ffconcat version 1.0\n" + chunks.map(chunk => {
            return `file '${chunk.url}'`;
        }).join("\n") + "\n";

        await fs.writeFile(listFile, lines);

        const result = await new Promise((resolve, reject) => {
            const ffmpegInstance = ffmpeg(listFile)
                .inputFormat(ffmpegConfig.format)
                .addInputOption(ffmpegConfig.options)
                .audioCodec(ffmpegConfig.codec)
                .audioBitrate(ffmpegConfig.bitrate);

            ffmpegInstance.once("error", reject);
            ffmpegInstance.once("end", async () => {
                if (!this.params.delete) {
                    return resolve(output);
                }

                const content = await fs.readFile(output);
                await fs.remove(output);
                return resolve(content);
            });

            ffmpegInstance.saveToFile(output);
        });

        chunks = null;
        await fs.remove(this.params.chunksFolder);

        return result;
    }

    async downloadMP3 (link, outputFolder) {
        this.params.name = filenamify(this.params.name);
        const output = path.join(outputFolder, this.params.name + ".mp3");
        const response = await fetch(link);
        const progress = new fetchProgress(response);
        progress.on("progress", p => {
            this.emit("progress", { percent: p.progress * 100 });
        });

        const buffer = await response.buffer();
        fs.writeFileSync(output, buffer, "binary");
        return new Promise(resolve => {
            if (this.params.delete) {
                resolve(buffer);
                return fs.remove(output);
            }

            return resolve(output);
        });
    }

    /**
     *
     * @param {string} link
     * @param {string} ffmpegPath
     * @param {string} outputFolder
     * @returns {Buffer | string}
     */
    async download (link, outputFolder) {
        if (!link || typeof link !== "string") {
            throw new Error("Invalid link");
        }

        if (!fs.existsSync(this.params.chunksFolder)) {
            fs.mkdirsSync(this.params.chunksFolder);
        }

        if (!fs.existsSync(outputFolder)) {
            fs.mkdirsSync(outputFolder);
        }

        link = link.replace("&long_chunk=1", "");
        const extension = link
            .split(/[#?]/)[0]
            .split(".")
            .pop()
            .trim();

        return extension !== "mp3"
            ? await this.downloadM3U8(link, outputFolder)
            : await this.downloadMP3(link, outputFolder);
    }
}

module.exports = hls;