const AudioStatic = require("../static/audio");
const Promise = require("bluebird");
const querystring = require("querystring");
class AudioRequests extends AudioStatic {
    constructor (client, params) {
        super(client, params);
    }

    // --------------------------------------- DEFAULT ACTIONS --------------------------------------------------
    async getAll (params = {}) {
        let { audios, more } = await this.get(params);
        while (more.next_from.length > 0) {
            const next = await this.get({
                ...params,
                more
            });

            audios = [...audios, ...next.audios];
            more = next.more;
        }

        return audios;
    }

    async getFromWall (params = {}) {
        if (!params.owner_id || !params.post_id) {
            throw new Error("You must to specify owner id and post id");
        }

        const res = await this.request({}, true, false, `wall${params.owner_id}_${params.post_id}`);
        const list = this.getAudiosFromHTML(res);

        if (!list.length) {
            return {
                post: [],
                comments: []
            };
        }

        if (params.raw) {
            list.forEach(s => s[2] = "");
        }

        const postAudios = list.filter(item => item[11] !== "replies");
        const commentsAudios = list.filter(item => item[11] === "replies");

        const post = postAudios.length ? this.getRawAudios(postAudios) : [];
        const comments = commentsAudios.length ? this.getRawAudios(commentsAudios) : [];

        return { post, comments };
    }

    async get (params = {}) {
        if (params.more) {
            const result = await this.withMoreMobile({ 
                more: params.more,
                ...params
            });

            return result;
        } else {
            const owner_id = params.owner_id ? Number(params.owner_id) : this.user_id;

            let { data: payload } = await this.request({ _ajax: 1 }, true, true, `audios${owner_id}`);
            if (!payload) {
                throw new Error("Access denied");
            }
            
            payload = payload[1];

            if (payload.playlist.list) {
                const data = await this.parsePayload(payload, params);
                return data;
            }
        }
    }

    async parsePayload (payload, params) {
        let { list } = payload.playlist;

        if (params.count !== undefined) {
            list = list.splice(0, params.count);
        }

        const audios = params.raw
            ? this.getRawAudios(list)
            : await this.parse(list, params);

        return {
            audios,
            more: {
                next_from: payload.next_from || ""
            }
        };
    }

    async withMore (params = {}) {
        
        /*
            more: object (from search())
        */

        if (!params.more) {
            throw new Error("Pass a valid \"more\" object");
        }
    
        if (!params.more.section_id.length || !params.more.start_from.length) {
            throw new Error("Pass a valid \"more\" object");
        }

        const res = await this.request({
            act: "load_catalog_section",
            al: 1,
            section_id: params.more.section_id,
            start_from: params.more.start_from
        });

        const payload = res.payload[1][1];

        const section_id = payload.sectionId;
        const start_from = payload.next_from || payload.nextFrom;
    
        const list = payload.playlist.list || payload.playlists[0].list;

        const audios = params.raw
            ? params.normalize
                ? this.getRawAudios(list)
                : list
                
            : await this.parse(list, params);

        return { 
            audios, 
            more: { section_id, start_from }
        };
    }

    async withMoreMobile (params = {}) {
        const owner_id = params.owner_id ? Number(params.owner_id) : this.user_id;

        let { data: payload } = await this.request({ _ajax: 1 }, true, true, 
            `/audios${owner_id}?section=user&start_from=${params.more.next_from}`);

        payload = payload[1];

        if (payload.playlist.list) {
            const data = await this.parsePayload(payload, params);
            return data;
        } else {
            throw new Error("Access denied");
        }
    }

    async getById (params = {}) {
        const doRequest = async () => {
            const res = await this.request({
                act: "reload_audio",
                ids: params.ids
            }, true, true, "audio");

            return res.data 
                ? res.data[0] 
                : await doRequest();
        };

        const validRes = res => res !== null && !~res.indexOf("no_audios");

        const attempt = async () => {
            const response = await doRequest();
            return validRes(response) ? response : await attempt();
        };

        const res = await attempt();
        return res;
    }

    async getLyrics (params = {}) {

        /*
            full_id: string
            lyrics_id: number

            returns lyrics of audio. You can set random values and vk return random lyrics. 
            idk how it's working...
        */

        if (!params.full_id) {
            console.error("You must to specify full_id");
            return;
        }

        if (!params.lyrics_id) {
            console.error("You must to specify lyrics_id");
            return;
        }

        const { payload } = await this.request({
            act: "get_lyrics",
            aid: params.full_id,
            al: 1,
            lid: params.lyrics_id
        });

        try { return payload[1][0];
        } catch (e) { return ""; }
    }

    async loadPage (params = {}) {

        /*
            type: string
        */

        if (!params.type) {
            console.error("You must to specify type");
            return;
        }

        const { payload } = await this.request({
            act: "load_section",
            al: 1,
            claim: 0,
            offset: 0,
            owner_id: this.user_id,
            playlist_id: params.type,
            type: "recoms",
            track_type: "default",
            XML: true
        });

        const { list } = payload[1][0];
        const audios = params.raw 
            ? this.getRawAudios(list)
            : await this.parse(list, params);
            
        return audios;
    }

    async normalize (array, params) {
        let restricted_ids = [];

        const adi = array.map((a, i) => {
            const id = this.getAdi(a);

            if (id === null) {
                restricted_ids = [...restricted_ids, i];
                return this.getAudioAsObject(a, params);
            } 
            
            return id;
        });
        
        const filtered = adi.filter(v => !v.id);
        const mapped = filtered.map(a => a.join("_"));
        const ids = mapped.join(",");
        let audios = await this.getById({ ids });
        audios = audios.map(a => this.getAudioAsObject(a, params));
        const audios_ready = [];
        let b = 0;

        adi.forEach((e, i) => {
            if (!~restricted_ids.indexOf(i)) {
                audios_ready[i] = audios[b];
                b++;
            } else {
                audios_ready[i] = e;
            }
        });

        return audios_ready;
    }

    getRawAudios (audios) {

        /*
            A function that returns audio as objects from its ids without URLs
            You can use parse(array) manually when it requires
        */

        return audios.map(a => ({
            raw: a,
            ...this.getAudioAsObject(a)
        }));
    }

    async parse (audios, params = {}) {

        /*
            A function that returns audio as objects from its ids
        */

        if (!audios || !audios.length) {
            throw new Error("Audios is null");
        }

        const result = await Promise.map(
            this.chunkify(audios, 10), 
            async array => await this.normalize(array, params), 
            { concurrency: 10 }
        );

        return result.flat(1);
    }

    // --------------------------------------- USER ACTIONS -------------------------------------------------------

    async add (audio = {}) {
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
        });

        const audios = await this.parse([res.payload[1][0]]);
        return audios[0];
    }

    async delete (audio = {}) {
        await this.request({
            act: "delete_audio",
            aid: Number(audio.id),
            al: 1,
            hash: audio.delete_hash,
            oid: Number(audio.owner_id),
            restore: 1,
            track_code: audio.track_code
        });

        return true;
    }

    async edit (audio = {}, params = {}) {

        /*
            performer?: string
            title?: string
            privacy?: number
        */

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

        let res = await this.request(params);
        while (res.payload[0] !== 0) {
            res = await this.request(params);
            await Promise.delay(2000);
        }

        const audios = await this.parse(res.payload[1], params);
        return audios[0];
    }

    async reorder (params = {}) {

        /*
            audio_id: number
            next_audio_id: number,
            owner_id?: number
        */

        await this.request({
            act: "reorder_audios",
            al: 1,
            audio_id: params.audio_id || -1,
            hash: this.reorderHash || await this.getReorderHash() || "",
            next_audio_id: params.next_audio_id || 0,
            owner_id: params.owner_id || this.user_id
        });

        return true;
    }

    async upload (path = "") {
        if (!path) {
            console.error("You must to specify path in params");
            return;
        }

        const { upload_url: url } = await this.vk.call("audio.getUploadServer").catch(e => console.error(e));
        const data = await this.uploader.uploadFile(url, path, "file", {}).catch(e => console.error(e));
        
        const saved = await this.vk.post("audio.save", data).catch(async () => { // try to bypass copyright
            try {
                const redirectOptionsString = data.redirect.match(/audio.php\?(.*)/)[1];
                const { audio } = querystring.parse(redirectOptionsString);
                const { payload } = await this.request({
                    act: "done_add",
                    al: 1,
                    go_uploader_response: audio,
                    upldr: 1
                }, true, false);
                
                return this.getAudioAsObject(payload[1][0]);
            } catch (e) {
                console.error(e);
                return e;
            }
        });

        return saved;
    }
    
    // --------------------------------------- OTHER ------------------------------------------------------

    async getReorderHash () {
        const res = await this.request({ retOnlyBody: true }, false);
            
        let reorderHash = res.match(/"audiosReorderHash":"(.*?)"/g);
        reorderHash = (reorderHash[0].split(":")[1] || "").replace(/"/g, "");
        this.reorderHash = reorderHash;
        
        return reorderHash;
    }
}

module.exports = AudioRequests;