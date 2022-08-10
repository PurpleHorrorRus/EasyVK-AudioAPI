const PlaylistsStatic = require("../static/playlists");
const AudioRequests = require("./audio");

const { URL } = require("url");
const { encode } = require("querystring");

class PlaylistsRequest extends PlaylistsStatic {
    constructor (client, vk) {
        super(client, vk);
        this.audio = new AudioRequests(client, vk);
    }

    // --------------------------------------- DEFAULT ACTIONS --------------------------------------------------

    async get (params = {}) {

        /*
            access_hash?: string
            offset?: number
            owner_id?: number
        */

        const res = await this.request({
            access_hash: params.access_hash || "",
            act: "owner_playlists",
            al: 1,
            is_attach: 0,
            offset: params.offset || 0,
            owner_id: params.owner_id || this.user,
            isPlaylist: true 
        });

        const payload = res.payload[1];
        const [pl_objects, count] = payload;

        if (typeof pl_objects === "string" || /Access denied/.test(pl_objects)) {
            throw new Error("Access Denied");
        }

        if (params.getCount) {
            return count;
        }

        return {
            count,
            playlists: pl_objects.map(playlist => this.getPlaylistInfo(playlist))
        };
    }

    async getPlaylist (params = {}) {

        /*
            owner_id: number
            playlist_id: number
            list?: boolean
            Access Hash forces list = true automatically if you want to load third-party playlists (general page or search for example)
        */
        if (!params.owner_id) {
            params.owner_id = this.user;
        }

        const isMy = params.owner_id === this.user;

        let context = isMy ? "my" : "user_playlists";
        if (params.owner_id < 0) {
            context = "group_list";
        }

        const { payload } = await this.request({
            act: "load_section",
            access_hash: params.access_hash || "",
            al: 1,
            claim: 0,
            context,
            from_id: Number(params.owner_id),
            is_loading_all: 1,
            is_preload: 0,
            offset: 0,
            owner_id: Number(params.owner_id),
            playlist_id: Number(params.playlist_id),
            type: "playlist" 
        }, true, false);

        const raw_playlist = payload[1][0];
        const playlist = this.getPlaylistInfo(raw_playlist);
        playlist.list = params.list
            ? await this.audio.parseAudios(raw_playlist.list, params)
            : [];

        return playlist;
    }

    async getAllSongs (params = {}) {
        const { list } = await this.getPlaylist({
            ...params,
            list: true 
        });

        return list;
    }

    async getById (params = {}) {

        /*
            access_hash?: string
            owner_id?: number
            playlist_id: number
            count?: number = 50
            list: boolean
        */

        if (!params.playlist_id) {
            throw new Error("You must to specify playlist_id");
        }

        let { payload } = await this.request({
            access_hash: params.access_hash || "",
            act: "load_section",
            al: 1,
            claim: 0,
            context: "",
            from_id: this.user,
            is_loading_all: 1,
            is_preload: 0,
            offset: 0,
            owner_id: params.owner_id || this.user,
            playlist_id: params.playlist_id,
            type: "playlist" 
        });

        payload = payload[1][0];

        if (!payload) {
            console.error("getPlaylistById error");
            return;
        }

        const playlist = this.getPlaylistInfo(payload);
        if (params.list) {
            if (!payload.list) {
                console.error("getById fetching list error");
                return;
            }

            if (playlist.official) {
                params.count = params.list.length;
            }

            const count = params.count || 50;
            const offset = params.offset || 0;
            const needSplice = offset > 0 || payload.list.length > count;
            const list = needSplice ? payload.list.splice(offset, count) : payload.list;

            playlist.list = await this.audio.parseAudios(list, params);
        }

        return playlist;
    }

    async getCount (params = {}) {

        /*
            owner_id?: number
        */

        params.getCount = true;
        const count = this.get(params);
        return count;
    }

    async getByBlock (params = {}) {
        return await this.getDataByBlock(this, params);
    }

    async withMore (more, params = {}) {
        return await this.getDataWithMore(this, more, params);
    }

    async getFromWall (params = {}) {
        if (!params.playlist_id) {
            throw new Error("You must to specify playlist_id");
        }

        const owner_id = params.owner_id || this.user;

        const { payload } = await this.request({
            act: "load_section",
            access_hash: params.access_hash || "",
            al: 1,
            claim: 0,
            context: owner_id >= 0 ? "user_wall" : "group_wall",
            from_id: owner_id !== this.user ? owner_id : this.user,
            is_loading_all: 1,
            is_preload: 0,
            offset: 0,
            owner_id,
            playlist_id: params.playlist_id,
            type: "playlist"
        });

        const raw = payload[1][0];
        const playlist = this.getPlaylistInfo(raw);

        const count = params.count || 50;
        const offset = params.offset || 0;
        const needSplice = offset > 0 || raw.list.length > count;
        const list = needSplice ? raw.list.splice(offset, count) : raw.list;

        playlist.list = await this.audio.parseAudios(list, params);

        return playlist;
    }

    // --------------------------------------- USER ACTIONS --------------------------------------------------

    async create (params = {}) {

        /*
            title: string
            description: string
            cover?: string (path)
        */

        const res = await this.request({
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
        
        return this.getPlaylistInfo(res.payload[1][0]);
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
            playlist_id: playlist.playlist_id
        });
    }

    async follow (playlist = {}) {

        /*
            playlist: object
        */

        if (!playlist.follow_hash) {
            throw new Error("Access Denied");
        }

        await this.request({
            act: "follow_playlist",
            al: 1,
            hash: playlist.follow_hash,
            playlist_id: playlist.playlist_id,
            playlist_owner_id: playlist.owner_id 
        });

        return true;
    }

    async reorder (params = {}) {
        return await this.call("audio.reorderPlaylists", {
            owner_id: params.owner_id || this.user,
            ...params
        });
    }

    async addSong (audio, playlist) {
        if (!audio || !playlist) {
            throw new Error("You must to specify audio and playlist");
        }

        return await this.call("audio.addToPlaylist", {
            owner_id: playlist.owner_id,
            playlist_id: playlist.playlist_id,
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
            playlist_id: playlist.playlist_id,
            audio_ids: Array.isArray(audio)
                ? audio.map(audio => `${audio.owner_id}_${audio.id}`) 
                : `${audio.owner_id}_${audio.id}`
        });
    }

    // --------------------------------------- COVER --------------------------------------------------

    async uploadCover (coverFile = "") {
        const url = await this.getUploadCoverURL();
        const response = await this.uploadToServer(url, coverFile, "photo");
        return JSON.stringify(response); 
    }

    async getUploadCoverURL () {
        const res = await this.mainPage();
        const [, url] = res.match(/\"url\":\"(.*?)\"/);

        let hash = res.match(/"hash":"(.*?)"/g);
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
        const res = await this.mainPage();
        let newPlaylistHash = res.match(/"newPlaylistHash":"(.*?)"/g);
        newPlaylistHash = (newPlaylistHash[0].split(":")[1] || "").replace(/"/g, "");
        return newPlaylistHash;
    }
}

module.exports = PlaylistsRequest;