const Static = require("../static");
const AudioRequests = require("./audio");

const { URL } = require("url");
const { encode } = require("querystring");

class PlaylistsRequest extends Static {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
        this.audio = new AudioRequests(client, vk, params);
    }

    // --------------------------------------- DEFAULT ACTIONS --------------------------------------------------

    async get (params = {}) {
        return await this.call("audio.getPlaylists", {
            owner_id: params.owner_id || this.user,
            count: params.count || 100,
            offset: params.offset || 0,
            extended: params.extended || 0,
            field: params.fields || "",
            filters: params.filters || "all"
        });
    }

    async getPlaylist (params = {}) {
        const playlist = await this.call("audio.getPlaylistById", {
            access_key: params.access_key || "",
            owner_id: params.owner_id || this.user,
            playlist_id: params.playlist_id || -1
        });

        let list = [];

        if (params.list) {
            const response = await this.audio.get({
                access_key: playlist.access_key,
                owner_id: playlist.owner_id,
                playlist_id: playlist.id,
                count: playlist.count
            });

            list = response.items;
        }

        playlist.list = list;
        return playlist;
    }

    // --------------------------------------- USER ACTIONS --------------------------------------------------

    async create (params = {}) {

        /*
            title: string
            description: string
            cover?: string (path)
        */

        const response = await this.request({
            Audios: "",
            act: "save_playlist",
            al: 1,
            cover: params.cover ? await this.uploadCover(params.cover) : "",
            description: params.description,
            hash: await this.getNewHash(),
            owner_id: this.user,
            playlist_id: 0,
            title: params.title,
            isPlaylist: true 
        });
        
        return this.getPlaylistInfo(response.payload[1][0]);
    }

    async edit (params = {}) {

        /*
            playlist_id: number
            title?: string
            description?: string
            cover?: string
        */

        if (!params.playlist_id) {
            console.error("You must to specify playlist");
            return;
        }

        const playlist = await this.getPlaylist({
            playlist_id: params.playlist_id,
            list: true,
            raw: true 
        });

        if (!playlist.edit_hash) {
            console.error("Can't fetch edit_hash of playlist due internal VK error");
            return;
        }

        const Audios = playlist.list.map(audio => {
            return audio.full_id;
        }).join(",");

        await this.request({
            act: "save_playlist",
            Audios,
            al: 1,
            cover: params.cover ? await this.uploadCover(params.cover) : 0,
            description: params.description ?? playlist.description,
            hash: playlist.edit_hash,
            no_discover: params.no_discover || 0,
            owner_id: playlist.owner_id || this.user,
            playlist_id: params.playlist_id,
            title: params.title || playlist.title
        });

        return true;
    }

    async delete (playlist) {
        return await this.call("audio.deletePlaylist", {
            owner_id: playlist.owner_id,
            playlist_id: playlist.id
        });
    }

    async follow (playlist) {
        return await this.call("audio.followPlaylist", {
            owner_id: playlist.owner_id,
            playlist_id: playlist.id
        });
    }

    async reorder (params = {}) {
        return await this.call("audio.reorderPlaylists", {
            ...params,
            owner_id: params.owner_id || this.user,
            playlist_id: params.playlist_id
        });
    }

    async addSong (audio, playlist) {
        if (!audio || !playlist) {
            throw new Error("You must to specify audio and playlist");
        }

        return await this.call("audio.addToPlaylist", {
            owner_id: playlist.owner_id,
            playlist_id: playlist.id,
            audio_ids: Array.isArray(audio)
                ? audio.map(audio => `${audio.owner_id}_${audio.id}`) 
                : `${audio.owner_id}_${audio.id}`
        });
    }

    async removeSong (audio, playlist) {
        if (!audio || !playlist) {
            throw new Error("You must to specify audio and playlist");
        }

        return await this.call("audio.removeFromPlaylist", {
            owner_id: playlist.owner_id,
            playlist_id: playlist.id,
            audio_ids: Array.isArray(audio)
                ? audio.map(audio => `${audio.owner_id}_${audio.id}`) 
                : `${audio.owner_id}_${audio.id}`
        });
    }

    // --------------------------------------- COVER --------------------------------------------------

    async uploadCover (coverFile = "") {
        const url = await this.getUploadCoverURL();
        return await this.client.upload(url, coverFile, "photo"); 
    }

    async getUploadCoverURL () {
        const response = await this.mainPage();
        const [, url] = response.match(/\"url\":\"(.*?)\"/);

        let hash = response.match(/"hash":"(.*?)"/g);
        hash = (hash[0].split(":")[1] || "").replace(/"/g, "");

        const query = encode({
            act: "audio_playlist_cover",
            ajx: 1,
            hash,
            mid: this.user,
            upldr: 1 
        });

        const complete = new URL(`${url}?${query}`);
        return complete.href;
    }

    // --------------------------------------- OTHEN --------------------------------------------------

    async getNewHash () {
        const response = await this.mainPage();
        let newPlaylistHash = response.match(/"newPlaylistHash":"(.*?)"/g);
        newPlaylistHash = (newPlaylistHash[0].split(":")[1] || "").replace(/"/g, "");
        return newPlaylistHash;
    }

    async getSaveHash (audio) {
        const response = await this.request({
            act: "more_playlists_add",
            al: 1,
            audio_id: audio.id,
            audio_owner_id: audio.owner_id,
            owner_id: this.user 
        });

        return response.payload[1][2].match(/], '(.*)'/)[1];
    }

    async getReorderHash () {
        const response = await this.mainPage();

        let reorderHash = response.match(/"reorderHash":"(.*?)"/g);
        reorderHash = (reorderHash[0].split(":")[1] || "").replace(/"/g, "");

        this.reorderPlaylistHash = reorderHash;
        return reorderHash;
    }
}

module.exports = PlaylistsRequest;