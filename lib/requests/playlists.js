const PlaylistsStatic = require("../static/playlists");
const AudioRequests = require("./audio");

const { URL } = require("url");
const { encode } = require("querystring");
const Promise = require("bluebird");
const retry = require("bluebird-retry");

class PlaylistsRequest extends PlaylistsStatic {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
        this.audio = new AudioRequests(client, vk, params);
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

        if (!~params.playlist_id) {
            console.error("You must to specify playlist_id");
            return;
        }

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

        if (payload[1].length > 0) {
            if (!payload[1][0]) {
                throw new Error("getPlaylist: Incorrect params");
            }

            const raw_playlist = payload[1][0];
            const playlist = this.getPlaylistInfo(raw_playlist);

            if (params.list) {
                playlist.list = params.raw ?
                    this.audio.getRawAudios(raw_playlist.list) :
                    await this.audio.parse(raw_playlist.list, params);
            }

            return playlist;
        } else {
            Promise.reject("Not successfull Retry");

            if (!params.isRetry) {
                return await retry(
                    this.getPlaylist({ ...params, isRetry: true }), 
                    {
                        interval: 500, 
                        max_tries: 30
                    }).catch(() => (null));
            }
        }
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

            playlist.list = params.raw ?
                this.audio.getRawAudios(list) :
                await this.audio.parse(list, params);
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

        playlist.list = params.raw ?
            this.audio.getRawAudios(list) :
            await this.audio.parse(list, params);

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

        const title = params.title ? params.title : playlist.title;
        const description = params.description ? params.description : playlist.description;
        const cover = params.cover ? await this.uploadCover(params.cover) : 0;

        const Audios = playlist.list.length ? playlist.list.map(l => l.full_id).join(",") : "";

        await this.request({
            Audios,
            act: "save_playlist",
            al: 1,
            cover,
            description,
            hash: playlist.edit_hash,
            owner_id: this.user,
            playlist_id: params.playlist_id,
            title 
        });

        return true;
    }

    async delete (playlist = {}) {
        if (!playlist.edit_hash) {
            throw new Error("Access denied");
        }

        await this.request({
            act: "delete_playlist",
            al: 1,
            hash: playlist.edit_hash,
            page_owner_id: playlist.owner_id || this.user,
            playlist_id: playlist.playlist_id,
            playlist_owner_id: playlist.owner_id || this.user
        });

        return true;
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

        /*
            playlist_id: number
            prev_playlist_id: number
        */

        await this.request({
            act: "reorder_playlist",
            al: 1,
            hash: this.reorderPlaylistHash ? this.reorderPlaylistHash : await this.getReorderHash(),
            owner_id: this.user,
            playlist_id: params.playlist_id,
            prev_playlist_id: params.prev_playlist_id 
        }).catch(e => new Error(e));

        return true;
    }

    async addSong (audio, playlist) {

        /*
            audio: object
            playlist: object
        */

        if (!audio || !playlist) {
            throw new Error("You must to specify audio and playlist");
        }

        await this.request({
            act: "save_audio_in_playlists",
            add_pl_ids: playlist.playlist_id,
            al: 1,
            audio_id: audio.id,
            audio_owner_id: audio.owner_id,
            hash: await this.getSaveHash(audio),
            owner_id: this.user,
            remove_pl_ids: "" 
        });

        return true;
    }

    async removeSong (audio, playlist) {

        /*
            audio: object
            playlist: object
        */

        if (!playlist.list || !playlist.list.length) {
            throw new Error("Playlist songs list is empty. Please provide playlist object with list");
        }

        const Audios = playlist.list.map(a => a.full_id);
        const index = playlist.list
            .findIndex(a => a.owner_id === audio.owner_id && a.id === audio.id);

        if (~index) {
            Audios.splice(index, 1);

            await this.request({
                act: "save_playlist",
                Audios: Audios.join(","),
                al: 1,
                cover: 0,
                description: playlist.description,
                hash: playlist.edit_hash,
                no_discover: 0,
                owner_id: playlist.owner_id,
                playlist_id: playlist.playlist_id,
                title: playlist.title 
            });
        }

        return index !== -1;
    }

    async reorderSongs (params = {}) {

        /*
            Audios: string (it must be string of full_ids, you can use join() for example, see example in unit-tests)
            playlist_id: number
            force?: boolean (if you really want to clean playlist)
        */

        if (!params.playlist_id) {
            throw new Error("You must to specify playlist_id");
        }

        const playlist = await this.getPlaylist({ playlist_id: params.playlist_id });

        if (!params.Audios && playlist.size > 0 && !params.force) { // Absolute protection :D
            throw new Error("I'm not really sure you want to leave the playlist empty. But if you do, specify in params force: true");
        }

        await this.request({
            Audios: params.Audios,
            act: "save_playlist",
            al: 1,
            cover: 0,
            description: playlist.description,
            hash: playlist.edit_hash,
            owner_id: this.user,
            playlist_id: params.playlist_id,
            title: playlist.title 
        });

        return true;
    }

    // --------------------------------------- COVER --------------------------------------------------

    async uploadCover (path = "") {
        const file = await this.uploader.upload(
            await this.getUploadCoverURL(), {
                formData: await this.uploader.buildPayload({
                    field: "photo",
                    maxFiles: 1,
                    attachmentType: "photo",
                    values: [{ value: path }] 
                }),
                timeout: 10000 
            });

        return JSON.stringify(file);
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

    async getSaveHash (audio) {
        const res = await this.request({
            act: "more_playlists_add",
            al: 1,
            audio_id: audio.id,
            audio_owner_id: audio.owner_id,
            owner_id: this.user 
        });

        return res.payload[1][2].match(/], '(.*)'/)[1];
    }

    async getReorderHash () {
        const res = await this.mainPage();

        let reorderHash = res.match(/"reorderHash":"(.*?)"/g);
        reorderHash = (reorderHash[0].split(":")[1] || "").replace(/"/g, "");

        this.reorderPlaylistHash = reorderHash;
        return reorderHash;
    }
}

module.exports = PlaylistsRequest;