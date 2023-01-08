const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const filenamify = require("filenamify");

const ffmpeg = require("fluent-ffmpeg");
const m3u8Parser = require("m3u8-parser");
const fetch = require("node-fetch-retry");
const fetchProgress = require("node-fetch-progress");
const Promise = require("bluebird");

const globalConfig = require("./configuration.json");

const fetchOptions = {
    retry: 10,
    pause: 3000,

    headers: {
        "User-Agent": globalConfig.headers["User-Agent"]
    }
};

const defaultParams = {
    output: "./output",
    name: null,
    chunks: path.resolve(`hls_${Math.floor(Math.random() * 1000)}`),
    delete: true,
    concurrency: 5,
    metadata: [],

    onProgress: () => (false),
    onProcessing: () => (false)
};

const ffmpegConfig = {
    format: "concat",
    options: ["-safe 0"],
    codec: "libmp3lame",
    bitrate: 320,
    coverOptions: ["-map 0:0", "-map 1:0", "-id3v2_version 3"]
};

class hls {
    constructor (audio, params = {}) {
        if (!params.ffmpeg) {
            throw new Error("You must to specify ffmpeg executable path");
        } else {
            if (!fs.existsSync(params.ffmpeg)) {
                throw new Error("ffmpeg executable not found");
            }
        }

        ffmpeg.setFfmpegPath(params.ffmpeg);

        this.audio = audio;

        this.params = {
            ...defaultParams,
            ...params
        };

        if (!fs.existsSync(this.params.chunks)) {
            fs.mkdirsSync(this.params.chunks);
        }

        if (!fs.existsSync(this.params.output)) {
            fs.mkdirsSync(this.params.output);
        }

        this.key = null;
        this.root = null;
    }

    async parse (link) {
        const data = await fetch(link, fetchOptions);
        const parser = new m3u8Parser.Parser();

        parser.push(await data.text());
        parser.end();

        const chunks = [];

        for (const segment of parser.manifest.segments) {
            if (!this.key && segment.key) {
                const keyResponse = await fetch(segment.key.uri, fetchOptions);
                this.key = await keyResponse.text();
                this.root = segment.key.uri.match(/(.*?)\/key/)[1];
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

    async downloadCover () {
        if (!this.audio.coverUrl_p && !this.audio.album?.thumb) {
            return "";
        }

        const cover = this.audio.album?.thumb
            ? (this.audio.album.thumb.photo_1200 || this.audio.album.thumb.photo_600)
            : this.audio.coverUrl_p;

        const pathToCover = path.resolve(this.params.chunks, `${this.audio.id}.jpg`);
        const stream = fs.createWriteStream(pathToCover);

        return new Promise(async resolve => {
            stream.once("finish", () => resolve(pathToCover));

            const response = await fetch(cover, fetchOptions);
            return response.body.pipe(stream);
        });
    }

    metadata () {
        return [
            ["artist", this.audio.performer || this.audio.artist || ""],
            ["title", this.audio.title],
            ["album", this.audio.album?.title || ""],
            ["encoded_by", "EasyVK-Audio"],
            ...this.params.metadata
        ];
    }

    async downloadM3U8 () {
        let [chunks, cover] = await Promise.all([
            this.parse(this.audio.url),
            this.downloadCover(this.audio)
        ]);

        if (chunks.length === 0) {
            throw new Error("Chunks are empty");
        }

        let downloaded = 0;
        await Promise.map(chunks, async chunk => {
            const data = await this.decrypt(chunk);

            if (data) {
                chunk.url = path.join(this.params.chunks, chunk.name);
                fs.writeFileSync(chunk.url, data, { encoding: "binary" });

                downloaded++;
            }

            return this.params.onProgress((downloaded / chunks.length) * 100);
        }, { concurrency: this.params.concurrency });

        this.params.onProcessing();
        if (!this.params.name) {
            this.params.name = chunks[0].name;
        }

        this.params.name = filenamify(this.params.name);

        const output = path.join(this.params.output, (this.params.name + ".mp3").replace(".ts.mp3", ".mp3"));

        const listName = "list_" + filenamify(this.params.name.replaceAll(" ", "_")) + ".txt";
        const listFile = path.join(this.params.chunks, listName);

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

            for (const [key, value] of this.metadata()) {
                ffmpegInstance.outputOptions("-metadata", `${key}=${value}`);
            }

            ffmpegInstance.once("error", reject);
            ffmpegInstance.once("end", async () => {
                if (!this.params.delete) {
                    return resolve(output);
                }

                const content = await fs.readFile(output);
                await fs.remove(output);
                return resolve(content);
            });

            if (cover) {
                ffmpegInstance
                    .addInput(cover)
                    .addOptions(ffmpegConfig.coverOptions)
                    .videoCodec("copy");
            }

            ffmpegInstance.saveToFile(output);
        });

        chunks = null;
        await fs.remove(this.params.chunks);

        return result;
    }

    async downloadMP3 () {
        this.params.name = filenamify(this.params.name);
        const output = path.join(this.params.output, this.params.name + ".mp3");
        const response = await fetch(this.audio.url, fetchOptions);
        const progress = new fetchProgress(response);
        progress.on("progress", p => {
            this.params.onProgress(p.progress * 100);
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

    async download () {
        const link = this.audio.url.replace("&long_chunk=1", "");
        const extension = link
            .split(/[#?]/)[0]
            .split(".")
            .pop()
            .trim();

        return extension !== "mp3"
            ? await this.downloadM3U8()
            : await this.downloadMP3();
    }
}

module.exports = hls;