const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ffmpeg = require("fluent-ffmpeg");
const m3u8Parser = require("m3u8-parser");
const fetch = require("node-fetch");
const Promise = require("bluebird");

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

        return chunks;
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

    async download (chunks, folder = path.resolve("m3u8")) {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
        }

        await Promise.map(chunks, async chunk => {
            const data = await this.decrypt(chunk);
            if (data) {
                const filePath = path.join(folder, chunk.name);
                fs.writeFileSync(filePath, data, { encoding: "binary" });
                chunk.url = filePath;
            }
        });

        const output = path.join(folder, chunks[0].name + ".mp3");
        const listFile = path.join(folder, `list_${chunks[0].name}.txt`);
        fs.writeFileSync(listFile, chunks.map(i => "file '" + i.url + "'").join("\n"));

        return new Promise(resolve => {
            ffmpeg().on("end", () => {
                chunks.forEach(({ url }) => fs.unlinkSync(url));

                resolve(fs.readFileSync(output));
                chunks = null;

                fs.unlinkSync(output);
                fs.unlinkSync(listFile);
            })
                .input(listFile)
                .inputOptions(["-f concat", "-safe 0"])
                .save(output);
        });
    }

    async get (link) {
        const parsed = await this.parse(link);
        const downloaded = await this.download(parsed);

        return downloaded;
    }
}

module.exports = m3u8;