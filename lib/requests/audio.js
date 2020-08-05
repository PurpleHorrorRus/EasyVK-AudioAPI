const AudioStatic = require("../static/audio");

class AudioRequests extends AudioStatic {
    constructor (client) {
        super(client);
    }

    // --------------------------------------- DEFAULT ACTIONS --------------------------------------------------

    get (params = {}) {

        /*
            access_hash?: string
            owner_id?: number
            playlist_id?: number
            count?: number = 50 (If you want to get all the audio at once, I wish you strong nerves)
        */

        return new Promise(async (resolve, reject) => {
            const owner_id = params.owner_id ? Number(params.owner_id) : this.user_id;
            const playlist_id = params.playlist_id ? Number(params.playlist_id) : -1;
            const offset = params.offset ? Number(params.offset) : 0;
            
            const res = await this.request({
                access_hash: params.access_hash || "",
                act: "load_section",
                al: 1,
                claim: 0,
                owner_id,
                playlist_id,
                offset,
                type: "playlist",
                track_type: "default"
            }).catch(reject);

            const payload = res.payload[1][0];
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
            const audios = await this.getNormalAudios(list);

            return resolve({ audios, count });
        });
    }

    getById (params = {}) {
        return new Promise(async resolve => {
    
            const doRequest = async () => {
                const res = await this.request({
                    act: "reload_audio",
                    al: 1,
                    ids: params.ids
                });
                return res.payload[1][0];
            };

            const validRes = res => res !== null && res.indexOf("no_audios") === -1;

            const attempt = () => {
                return new Promise(async resolve => {
                    const response = await doRequest();
                    if (validRes(response)) return resolve(response);
                    else setTimeout(async () => resolve(await attempt()), 10 * 1000);
                });
            };

            const res = await attempt();
            return resolve(res);
        });
    }

    getCount (params = {}) {
        return new Promise(async (resolve, reject) => {
            params.getCount = true;
            const response = await this.get(params).catch(reject);
            if (!response) return reject(new Error("Get count error: access denied"));
            return resolve(response);
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

            const res = await this.request({
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

            const audios = await this.getNormalAudios(res.payload[1][0].list);
            return resolve(audios);
        });
    }

    getNormalAudios (audios) {

        /*
            A function that returns audio as objects from its ids
        */

        return new Promise(async resolve => {
            if (!audios || !audios.length) {
                new Error("No audios in query");
                return resolve([]);
            }
            let ready = [];
            let restricted_ids = [];

            for (const array of this.chunkify(audios)) {
                const adi = array.map((a, i) => {
                    const id = this.getAdi(a);
                    if (id === null) {
                        restricted_ids = [...restricted_ids, i];
                        return this.getAudioAsObject(a);
                    } return id;
                });
                
                const filtered = adi.filter(v => !v.id);
                const mapped = filtered.map(a => a.join("_"));
                let audios = await this.getById({ ids: mapped.join(",") }).catch(console.log);
                audios = audios.map(a => this.getAudioAsObject(a));

                const audios_ready = [];
                let b = 0;
                adi.forEach((e, i) => {
                    if (restricted_ids.indexOf(i) === -1) {
                        audios_ready[i] = audios[b];
                        b++;
                    } else audios_ready[i] = e;
                });
                
                restricted_ids = [];
                ready = [
                    ...ready,
                    ...audios_ready
                ];
            }
            
            return resolve(ready);
        });
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

            const audios = await this.getNormalAudios([res.payload[1][0]]);
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
            const audios = await this.getNormalAudios(res.payload[1]);
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