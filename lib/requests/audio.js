const AudioStatic = require("../static/audio");
const Promise = require("bluebird");

class AudioRequests extends AudioStatic {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
    }

    // --------------------------------------- DEFAULT ACTIONS --------------------------------------------------
    async get (params = {}) {
        if (params.more) {
            return await this.getDataWithMore(this, params.more, params);
        } else {
            const owner_id = params.owner_id ? Number(params.owner_id) : this.user;
            const query = owner_id === this.user ? new URLSearchParams({ section: "my" }) : "";

            const response = await this.request({}, false, false, `audios${owner_id}?${query}`);
            return { 
                audios: await this.builder(response, params),
                more: this.parseMore(response)
            };
        }
    }

    async getAll (params = {}) {
        let { audios, more } = await this.get(params);
        
        while (more) {
            const next = await this.get({
                ...params,
                more
            });

            audios = [...audios, ...next.list];
            more = next.more;
        }

        return audios;
    }

    async getFromWall (params = {}) {
        if (!params.owner_id || !params.post_id) {
            throw new Error("You must to specify owner id and post id");
        }

        const res = await this.request({}, true, false, `wall${params.owner_id}_${params.post_id}`);
        const post = await this.builder(res, {
            ...params,
            raw: true
        });

        if (!post.length) {
            return {
                post: [],
                comments: []
            };
        }

        return { 
            post: post.filter(item => item.raw[11] !== "replies"), 
            comments: post.filter(item => item.raw[11] === "replies")
        };
    }

    async parsePayload (payload, params) {
        if (!payload.playlist) {
            return {
                audios: [],
                more: null
            };
        }

        let { list } = payload.playlist;

        if (params.count !== undefined) {
            list = list.splice(0, params.count);
        }

        const audios = params.raw
            ? this.getRawAudios(list)
            : await this.parse(list, params);

        return {
            audios,
            more: this.parseMore(payload)
        };
    }

    async withMoreMobile (params = {}) {
        const owner_id = params.owner_id ? Number(params.owner_id) : this.user;

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

        const validRes = res => res && !~res.indexOf("no_audios");

        const attempt = async () => {
            const response = await doRequest();
            return validRes(response) ? response : await attempt();
        };

        return await attempt();
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
            owner_id: this.user,
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
            owner_id: params.owner_id || this.user
        });

        return true;
    }

    async upload (path = "", params = {}) {
        if (!path) {
            throw new Error("You must to specify path in params");
        }

        const response = await this.request({
            act: "new_audio",
            al: 1,
            gid: 0
        });

        const options = response.payload[1][2];
        const [, url] = options.match(/(https?:\/\/\S*\b)/);
    
        const uploaded = await this.client.upload(url, path);
        const saved = await this.request({
            act: "done_add",
            al: 1,
            go_uploader_response: await uploaded.text(),
            upldr: 1
        });

        return params.raw  
            ? this.getRawAudios(saved.payload[1])
            : await this.parse(saved.payload[1], params);
    }
    
    // --------------------------------------- OTHER ------------------------------------------------------

    async queue (audio) {
        if (!audio) {
            throw new Error("You must to pass audio object");
        }

        return await this.request({
            act: "queue_params",
            al: 1,
            audio_id: audio.id,
            hash: audio.action_hash,
            owner_id: audio.owner_id
        }, true, false);
    }

    async playback (audio) {
        if (!audio) {
            throw new Error("You must to pass audio object");
        }

        return await this.request({
            act: "start_playback",
            al: 1,
            audio_id: audio.id,
            hash: audio.action_hash,
            owner_id: audio.owner_id,
            uuid: this.uuid
        }, true, false);
    }

    async getReorderHash () {
        const res = await this.request({}, false);
            
        let reorderHash = res.match(/"audiosReorderHash":"(.*?)"/g);
        reorderHash = (reorderHash[0].split(":")[1] || "").replace(/"/g, "");
        this.reorderHash = reorderHash;
        
        return reorderHash;
    }

    async builder (response, params = {}) {
        switch (typeof response) {
            case "string": {
                response = this.builderHTML(response);
                break;
            }
            case "object": {
                response = response.payload[1][1]?.playlist?.list 
                    || this.builderHTML(response.payload[1][0].join(""));

                break;
            }
        }

        return params.raw  
            ? this.getRawAudios(response)
            : await this.parse(response, params);
    }
    
    async getByBlock (params = {}) {
        return await this.getDataByBlock(this, params);
    }

    async withMore (more, params = {}) {
        return await this.getDataWithMore(this, more, params, null);
    }
}

module.exports = AudioRequests;