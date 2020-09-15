const AudioStatic = require("../static/audio");
const Promise = require("bluebird");

class AudioRequests extends AudioStatic {
    constructor (client, params) {
        super(client, params);
    }

    // --------------------------------------- DEFAULT ACTIONS --------------------------------------------------

    get (params = {}) {

        /*
            access_hash?: string
            owner_id?: number
            playlist_id?: number
            count?: number = 50 (If you want to get all the audio at once, I wish you strong nerves)
        */

        const owner_id = params.owner_id ? Number(params.owner_id) : this.user_id;
        const playlist_id = params.playlist_id ? Number(params.playlist_id) : -1;
        const offset = params.offset ? Number(params.offset) : 0;

        return new Promise((resolve, reject) => {
            this.request({
                access_hash: params.access_hash || "",
                act: "load_section",
                al: 1,
                claim: 0,
                owner_id,
                playlist_id,
                offset,
                type: "playlist",
                track_type: "default"
            }).then(async ({ payload }) => {
                payload = payload[1][0];

                const { totalCount: count } = payload;
                if (params.getCount) {
                    return resolve(count);
                }

                const max = params.count || 50;
                let { list } = payload;
                if (!list) {
                    return reject(new Error("Access denied"));
                }
                
                list = list.length > max ? list.splice(0, max) : list;

                const audios = params.raw
                    ? this.getRawAudios(list)
                    : await this.parse(list);

                return resolve({ 
                    audios, 
                    count 
                });
            }).catch(reject);
        });
    }

    getAll (params = {}) {
        params.count = 100;
        params.offset = 0;
        params.raw = true;

        return new Promise(async resolve => {
            const { audios, count } = await this.get(params);
            params.offset = params.count;
            if (count <= params.offset) {
                return resolve({ audios, count });
            } else {
                let ready = audios;

                for (; params.offset < count; params.offset += params.count) {
                    const { audios } = await this.get(params);
                    ready = [
                        ...ready, 
                        ...audios
                    ];
                }

                resolve({ audios: ready, count });
                ready = null;
            }
        });
    }
    
    getFromWall (params = {}) {
        return new Promise(async (resolve, reject) => {
            if (!params.owner_id || !params.post_id) {
                return reject(new Error("You must to specify owner id and post id"));
            }

            const res = await this.request({}, true, false, `wall${params.owner_id}_${params.post_id}`);
            const list = this.getAudiosFromHTML(res);
            const audios = params.raw
                ? this.getRawAudios(list)
                : await this.parse(list);

            return resolve(audios);
        });
    }

    getWithMore (params = {}) {
        return new Promise((resolve, reject) => {
            if (!params.more) {
                this.mainPage().then(async html => {
                    const list = this.getAudiosFromHTML(html);

                    const audios = params.raw
                        ? this.getRawAudios(list)
                        : await this.parse(list);
    
                    return resolve(audios);
                }).catch(reject);
            }
        });
    }

    getById (params = {}) {
        return new Promise(async resolve => {
            const doRequest = async () => {
                const res = await this.request({
                    act: "reload_audio",
                    ids: params.ids
                }, true, true, "audio");

                if (res.data) {
                    return res.data[0];
                }

                else {
                    return await doRequest();
                }
            };

            const validRes = res => res !== null && !~res.indexOf("no_audios");

            const attempt = () => {
                return new Promise(async resolve => {
                    const response = await doRequest();
                    if (validRes(response)) return resolve(response);
                    else resolve(await attempt());
                });
            };

            const res = await attempt();
            return resolve(res);
        });
    }

    getCount (params = {}) {
        return new Promise((resolve, reject) => {
            params.getCount = true;
            this.get(params).then(resolve).catch(reject);
        });
    }

    loadPage (params = {}) {

        /*
            type: string
        */

        return new Promise(async (resolve, reject) => {
            if (!params.type) {
                return reject(new Error("You must to specify type"));
            }
            
            const uid = this.user_id;

            const { payload } = await this.request({
                act: "load_section",
                al: 1,
                claim: 0,
                offset: 0,
                owner_id: uid,
                playlist_id: params.type,
                type: "recoms",
                track_type: "default",
                XML: true
            });

            const { list } = payload[1][0];
            const audios = params.raw 
                ? this.getRawAudios(list)
                : await this.parse(list);
                
            return resolve(audios);
        });
    }

    normalizeChunk (array) {
        return new Promise(async (resolve, reject) => {
            let restricted_ids = [];

            const adi = array.map((a, i) => {
                const id = this.getAdi(a);
                if (id === null) {
                    restricted_ids = [...restricted_ids, i];
                    return this.getAudioAsObject(a);
                } return id;
            });
            
            const filtered = adi.filter(v => !v.id);
            const mapped = filtered.map(a => a.join("_"));
            const ids = mapped.join(",");
            let audios = await this.getById({ ids }).catch(reject);
            audios = audios.map(a => this.getAudioAsObject(a));

            const audios_ready = [];
            let b = 0;
            adi.forEach((e, i) => {
                if (!~restricted_ids.indexOf(i)) {
                    audios_ready[i] = audios[b];
                    b++;
                } else audios_ready[i] = e;
            });

            return resolve(audios_ready);
        });
    }

    getRawAudios (audios) {

        /*
            A function that returns audio as objects from its ids without URLs
            You can use parse(array) manually when it requires
        */

        if (!audios || !audios.length) {
            return Promise.reject(new Error("Audios is null"));
        }

        return [
            ...audios.map(a => ({
                raw: a,
                ...this.getAudioAsObject(a)
            }))
        ];
    }

    parse (audios) {

        /*
            A function that returns audio as objects from its ids
        */

        if (!audios || !audios.length) {
            return Promise.reject(new Error("Audios is null"));
        }

        return Promise.map(this.chunkify(audios), 
            async array => await this.normalizeChunk(array))
            .then(result => result.flat());
    }

    // --------------------------------------- USER ACTIONS -------------------------------------------------------

    add (audio = {}) {
        return new Promise(async (resolve, reject) => {
            
            const isGroup = audio.owner_id < 0;
            const group_id = !isGroup ? 0 : audio.owner_id;

            const res = await this.request({
                act: "add",
                al: 1,
                audio_id: Number(audio.id),
                audio_owner_id: Number(audio.owner_id),
                from: "user_list",
                group_id,
                hash: audio.add_hash,
                track_code: audio.track_code
            }).catch(reject);

            const audios = await this.parse([res.payload[1][0]]);
            return resolve(audios[0]);
        });

    }

    delete (audio = {}) {
        return new Promise(async (resolve, reject) => {
            await this.request({
                act: "delete_audio",
                aid: Number(audio.id),
                al: 1,
                hash: audio.delete_hash,
                oid: Number(audio.owner_id),
                restore: 1,
                track_code: audio.track_code
            }).catch(reject);
            return resolve(true);
        });
    }

    edit (audio = {}, params = {}) {

        /*
            performer?: string
            title?: string
            privacy?: number
        */

        return new Promise(async (resolve, reject) => {
            params = Object.assign(params, {
                act: "edit_audio",
                aid: audio.id,
                al: 1,
                hash: audio.edit_hash,
                oid: audio.owner_id,
                performer: params.performer || audio.performer || "",
                privacy: params.privacy || 0,
                title: params.title || audio.title || ""
            });

            const res = await this.request(params).catch(reject);
            const audios = await this.parse(res.payload[1]);
            return resolve(audios[0]);
        });
    }

    reorder (params = {}) {

        /*
            audio_id: number
            next_audio_id: number,
            owner_id?: number
        */

        const uid = this.user_id;

        return new Promise(async resolve => {
            await this.request({
                act: "reorder_audios",
                al: 1,
                audio_id: params.audio_id || -1,
                hash: this.reorderHash || await this.getReorderHash() || "",
                next_audio_id: params.next_audio_id || 0,
                owner_id: params.owner_id || uid
            }).catch(() => resolve(false));
            return resolve(true);
        });
    }

    upload (path = "") {
        return new Promise(async (resolve, reject) => {
            if (!path) {
                return reject(new Error("You must to specify path in params"));
            }

            const { upload_url: url } = await this.vk.call("audio.getUploadServer").catch(reject);
            const data = await this.uploader.uploadFile(url, path, "file", {}).catch(reject);
            const saved = await this.vk.post("audio.save", data).catch(reject);

            return resolve(saved);
        });
    }
    
    // --------------------------------------- OTHER ------------------------------------------------------

    getReorderHash () {
        return new Promise(async (resolve, reject) => {
            const res = await this.request({ retOnlyBody: true }, false).catch(reject);
            
            let reorderHash = res.match(/"audiosReorderHash":"(.*?)"/g);
            reorderHash = (reorderHash[0].split(":")[1] || "").replace(/"/g, "");
            this.reorderHash = reorderHash;

            return resolve(reorderHash);
        });
    }
}

module.exports = AudioRequests;