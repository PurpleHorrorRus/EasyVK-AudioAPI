const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const fetch = require("node-fetch");
const Promise = require("bluebird");

const ffmpeg = require("fluent-ffmpeg");

fetch.Promise = Promise;

class m3u8 {
    constructor(ffmpegPath) {
        ffmpeg.setFfmpegPath(ffmpegPath);
    }

    parse_m3u8 (link) {
        return new Promise(resolve => {
            fetch(link).then(data => {
                data.text().then(async playlist => {
                    playlist = playlist.replace(/\r?\n|\r/gm, "");
    
                    const urldir = link.match(/(.*?)index/)[1];
                    const regex = new RegExp("#EXT-X-KEY:(?:(?!#EXT-X-KEY:).)*", "gm");
                    const section_regex = /METHOD=([^,\n\r]+\#?)(?:,URI=([^\n]+)\"|)/;
                    const uri_regex = /\"(.*?)\?/;
    
                    let chunks = [];
                    let key_url = null;
    
                    for (const section of playlist.match(regex)) {
                        const matchSection = section.match(section_regex);
                        let [, METHOD] = matchSection;
    
                        if (/(.*)#/.test(METHOD)) {
                            METHOD = METHOD.match(/(.*)#/)[1];
                        }
                        
                        if (METHOD !== "NONE") {
                            if (!key_url) {
                                key_url = matchSection[2].match(uri_regex)[1];
                            }
    
                            const [, , file] = section.split(",");
                            const fileName = file.replace(/\?(.*)/, "");
                            const fileUrl = `${urldir}${file}`;
                            chunks = [...chunks, {
                                fileUrl,
                                keyMethhod: METHOD,
                                key: key_url,
                                fileName
                            }];
                        } else {
                            const splitted = section.split(",");
                            const fileEndpoints = [
                                splitted[1].match(/(.*?)#/)[1],
                                splitted[2]
                            ];
    
                            for (const endpoint of fileEndpoints) {
                                if (endpoint) {
                                    const fileName = endpoint.replace(/\?(.*)/, "");
                                    const fileUrl = `${urldir}${endpoint}`;
    
                                    chunks = [...chunks, {
                                        fileUrl,
                                        keyMethhod: METHOD,
                                        key: key_url,
                                        fileName
                                    }];
                                }
                                
                            }
                        }
                    }
    
                    let cached_key = null;
                    let index = 0;
    
                    for (const chunk of chunks) {
                        const keyUrl = chunk.key;
    
                        if (!cached_key) {
                            const data = await fetch(keyUrl);
                            cached_key = await data.text();
                        }
    
                        chunks[index].key = cached_key;
                        index++;
                    }
    
                    return resolve([chunks.filter(c => c.fileUrl.length), playlist]);
                });
            });
        });
    }

    async download_m3u8 (job, folder = path.resolve("m3u8")) {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
        }
    
        return new Promise(resolve => {
            const [chunks] = job;

            return Promise.map(chunks, async chunk => {
                let data = null;
                if (chunk.keyMethhod === "AES-128") {
                    const response = await fetch(chunk.fileUrl);
                    const cipheredData = await response.buffer();
                    const key = chunk.key;
                    const iv = cipheredData.slice(0, 16);
                    const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
                    decipher.setAutoPadding(0);
                    data = decipher.update(cipheredData);
                } else {
                    const response = await fetch(chunk.fileUrl);
                    data = await response.buffer();
                }
        
                if (data) {
                    const filePath = path.join(folder, chunk.fileName);
                    fs.writeFileSync(filePath, data, { encoding: "binary" });
                    chunk.fileUrl = filePath;
                }
            }).then(async () => {
                const output = path.join(folder, chunks[0].fileName + ".mp3");
                const inputNamesFormatted = "concat:" + chunks.map(i => i.fileUrl).join("|");
    
                ffmpeg()
                    .on("end", () => {
                        for (const chunk of chunks) {
                            if (fs.existsSync(chunk.fileUrl)) {
                                fs.unlinkSync(chunk.fileUrl);
                            }
                        }
                        
                        const file = fs.readFileSync(output);
                        resolve("data:audio/wav;base64," + file.toString("base64"));
                        try {
                            if (fs.existsSync(output)) {
                                fs.unlinkSync(output);
                            }
                        } catch (e) {
                            return;
                        }
                    })
                    .input(inputNamesFormatted)
                    .audioCodec("copy")
                    .output(output)
                    .run();
            });
        });
    }

    get (link) {
        return new Promise((resolve, reject) => {
            this.parse_m3u8(link)
                .then(result => {
                    this.download_m3u8(result)
                        .then(resolve)
                        .catch(reject);
                });
        });
    }
}

module.exports = m3u8;