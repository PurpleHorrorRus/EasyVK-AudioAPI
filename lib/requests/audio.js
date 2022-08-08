const Static = require("../static");

class AudioRequests extends Static {
    constructor (client, vk) {
        super(client, vk);
    }

    // --------------------------------------- DEFAULT ACTIONS --------------------------------------------------
    async get (params = {}) {
        return await this.call("audio.get", {
            access_key: params.access_key || "",
            owner_id: params.owner_id || this.user,
            playlist_id: params.playlist_id || -1,
            count: Math.min(params.count, 5000) || 100,
            offset: params.offset || 0
        });
    }

    async getById(ids) {
        return await this.call("audio.getById", {
            audios: ids.join(",")
        });
    }

    async getAll (params = {}) {
        let items = [];
        let count = 10000;

        while (items.length < count) {
            const response = await this.get({
                ...params,
                count: 5000,
                offset: items.length
            });

            items = items.concat(response.items);
            count = response.count;
        }

        return {
            items,
            count
        };
    }
    
    async getLyrics (lyrics_id) {
        const response = await this.call("audio.getLyrics", { lyrics_id });
        return response.text || "";  
    }

    async recommendations (params = {}) {
        return await this.call("audio.getRecommendations", {
            ...params,
            owner_id: params.owner_id || this.user
        })
    }

    // --------------------------------------- USER ACTIONS -------------------------------------------------------

    async add (audio = {}) {
        return await this.call("audio.add", {
            owner_id: audio.owner_id,
            audio_id: audio.id
        });
    }

    async delete (audio = {}) {
        return await this.call("audio.delete", {
            owner_id: audio.owner_id,
            audio_id: audio.id
        });
    }

    async edit (audio = {}, params = {}) {
        return await this.call("audio.delete", {
            owner_id: audio.owner_id,
            audio_id: audio.id,
            artist: params.artist || audio.artist,
            title: params.title || audio.title,
            genre: params.genre || audio.genre
        });
    }

    async reorder (params = {}) {
        return await this.call("audio.reorder", {
            ...params,
            owner_id: params.owner_id || this.user
        });
    }

    async upload (filePath = "") {
        const url = await this.call("audio.getUploadServer");
        const response = await this.uploadToServer(url.upload_url, filePath);
        return await this.call("audio.save", response);
    }

    async toggleStatus(audio, targets) {
        return await this.call("audio.setBroadcast", {
            audio: audio ? `${audio.owner_id}_${audio.id}` : "",
            target_ids: targets.join(",")
        });
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
}

module.exports = AudioRequests;