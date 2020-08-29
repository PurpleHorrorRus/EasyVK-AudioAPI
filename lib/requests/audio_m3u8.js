const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const m3u8Parser = require("m3u8-parser");
const fetch = require("node-fetch");
const Promise = require("bluebird");

const ffmpeg = require("fluent-ffmpeg");
const { resolve } = require("bluebird");

fetch.Promise = Promise;
class m3u8 {
    constructor (params) {
        this.params = params;
        ffmpeg.setFfmpegPath(params.path);
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
            if (segment.key) {
                if (!cacheKey) {
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

        return resolve(chunks);
    }

    async decrypt (chunk) {
        if (chunk.method === "AES-128") {
            const response = await fetch(chunk.url);
            const cipheredData = await response.buffer();
            const key = chunk.key;
            const iv = cipheredData.slice(0, 16);
            const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
            decipher.setAutoPadding(0);
    
            return Buffer.concat([
                decipher.update(cipheredData), 
                decipher.final()
            ]);
        } else {
            const response = await fetch(chunk.url);
            return await response.buffer();
        }
    }

    download (chunks, folder = path.resolve("m3u8")) {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
        }

        return Promise.map(chunks, async chunk => {
            const data = await this.decrypt(chunk);
            if (data) {
                const filePath = path.join(folder, chunk.name);
                fs.writeFileSync(filePath, data, { encoding: "binary" });
                chunk.url = filePath;
            }
        }).then(() => {
            const output = path.join(folder, chunks[0].name + ".mp3");
            const inputNamesFormatted = "concat:" + chunks.map(i => i.url).join("|");

            return new Promise(resolve => {
                ffmpeg()
                    .on("end", () => {
                        chunks.forEach(({ url }) => fs.unlinkSync(url));

                        resolve(fs.readFileSync(output));
                        chunks = null;

                        fs.unlinkSync(output);
                    })
                    .input(inputNamesFormatted)
                    .output(output).run();
            });
        });
    }

    async get (link) {
        return await this.download(
            await this.parse(link)
        );
    }
}

module.exports = m3u8;