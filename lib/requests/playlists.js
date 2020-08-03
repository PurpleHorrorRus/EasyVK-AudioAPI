const PlaylistsStatic = require("../static/playlists");
const AudioRequests = require("./audio");

const { URL } = require("url");
const { encode } = require("querystring");

class PlaylistsRequest extends PlaylistsStatic {
    constructor (client) {
        super(client);
        this.audio = new AudioRequests(client);
    }

    // --------------------------------------- DEFAULT ACTIONS --------------------------------------------------

    get (params = {}) {

        /*
            access_hash?: string
            offset?: number
            owner_id?: number
        */

        return new Promise(async (resolve, reject) => {
            const res = await this.request({
                access_hash: params.access_hash || "",
                act: "owner_playlists",
                al: 1,
                is_attach: 0,
                offset: params.offset || 0,
                owner_id: params.owner_id || this.user_id,
                isPlaylist: true
            });

            const payload = res.payload[1];
            const [pl_objects, count] = payload;

            if (params.getCount) {
                return resolve(count);
            }
            
            if (/Access denied/.test(pl_objects)) return reject(new Error("Access Denied"));
            
            const playlists = pl_objects.map(e => this.getPlaylistAsObject(e));
            return resolve({
                count,
                playlists
            });
        });
    }

    getPlaylist (params = {}) {

        /*
            owner_id: number
            playlist_id: number
            list?: boolean
            Access Hash forces list = true automatically if you want to load third-party playlists (general page or search for example)
        */

        return new Promise(async (resolve, reject) => {
            if (!~params.playlist_id) {
                return reject(new Error("You must to specify playlist_id"));
            }

            if (!params.owner_id) {
                params.owner_id = this.user_id;
            }

            if (params.access_hash) {
                params.list = true;
            }

            const isMy = params.owner_id === this.user_id;

            let context = isMy ? "my" : "user_playlists";
            if (params.owner_id < 0) {
                context = "group_list";
            }

            const res = await this.request({
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
            }, true, false, "al_audio.php?act=load_section").catch(reject);

            const _p = res.payload[1][0];
            const playlist = this.getPlaylistInfo(_p);

            if (params.list) {
                playlist.list = await this.audio.getNormalAudios(_p.list);
            }

            return resolve(playlist);
        });
    }

    getById (params = {}) {

        /*
            access_hash?: string
            owner_id?: number
            playlist_id: number
            count?: number = 50
            list: boolean
        */

        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            if (!params.playlist_id) {
                return reject(new Error("You must to specify playlist_id"));
            }

            const res = await this.request({
                access_hash: params.access_hash || "",
                act: "load_section",
                al: 1,
                claim: 0,
                context: "",
                from_id: uid,
                is_loading_all: 1,
                is_preload: 0,
                offset: 0,
                owner_id: params.owner_id || uid,
                playlist_id: params.playlist_id,
                type: "playlist"
            });

            const payload = res.payload[1][0];
            if (!payload) {
                return reject(new Error("getPlaylistById error"));
            }

            const playlist = this.getPlaylistInfo(payload);
            if (params.list) {
                if (!payload.list) {
                    return reject(new Error("getById fetching list error"));
                }

                if (playlist.official) {
                    params.count = params.list.length;
                }

                const count = params.count || 50;
                const offset = params.offset || 0;
                const needSplice = offset > 0 || payload.list.length > count;
                const list = needSplice ? payload.list.splice(offset, count) : payload.list;
                playlist.list = await this.audio.getNormalAudios(list);
            } return resolve(playlist);
        });
    }

    getCount (params = {}) {

        /*
            owner_id?: number
        */

        return new Promise(async (resolve, reject) => {
            params.getCount = true;
            const count = await this.get(params).catch(reject);
            return resolve(count);
        });
    }

    getByBlock (params = {}) {

        /*
            block: string,
            section?: string
        */

        return new Promise(async (resolve, reject) => {
            if (!params.block) {
                return reject(new Error("You must to specify type"));
            }

            const res = await this.request({
                block: params.block,
                section: params.section || "recoms"
            }).catch(reject);

            const playlists = this.build(res);
            return resolve(playlists);
        });
    }

    // --------------------------------------- USER ACTIONS --------------------------------------------------

    create (params = {}) {

        /*
            title: string
            description: string
            cover?: string (path)
        */

        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            const cover = params.cover ? await this.uploadCover(params.cover).catch(reject) : "";
            const res = await this.request({
                Audios: "",
                act: "save_playlist",
                al: 1,
                cover,
                description: params.description,
                hash: await this.getNewHash(),
                owner_id: uid,
                playlist_id: 0,
                title: params.title,
                isPlaylist: true
            }).catch(reject);

            const playlist = this.getPlaylistInfo(res.payload[1][0]);
            return resolve(playlist);
        });
    }

    edit (params = {}) {

        /*
            playlist_id: number
            title?: string
            description?: string
            cover?: string
        */

        const uid = this.user_id;
        return new Promise(async (resolve, reject) => {
            if (!params.playlist_id) {
                return reject(new Error("You must to specify playlist"));
            }

            const playlist = await this.getPlaylist({
                playlist_id: params.playlist_id,
                list: true
            }).catch(reject);

            const { edit_hash, list } = playlist;

            const title = params.title ? params.title : playlist.title;
            const description = params.description ? params.description : playlist.description;
            const cover = params.cover ? await this.uploadCover(params.cover).catch(reject) : 0;

            const Audios = list.length ? list.map(l => l.full_id).join(",") : "";

            await this.request({
                Audios,
                act: "save_playlist",
                al: 1,
                cover,
                description,
                hash: edit_hash,
                owner_id: uid,
                playlist_id: params.playlist_id,
                title
            }).catch(reject);

            return resolve(true);
        });
    }

    delete (playlist = {}) {
        return new Promise(async (resolve, reject) => {
            if (!playlist.edit_hash) return reject(new Error("Access denied"));

            await this.request({
                act: "delete_playlist",
                al: 1,
                hash: playlist.edit_hash,
                page_owner_id: playlist.owner_id,
                playlist_id: playlist.id,
                playlist_owner_id: playlist.owner_id
            }).catch(reject);

            return resolve(true);
        });
    }
    
    follow (playlist = {}) {

        /*
            playlist: object
        */

        return new Promise(async (resolve, reject) => {
            if (!playlist.follow_hash) { return reject(new Error("Access Denied")); }
    
            await this.request({
                act: "follow_playlist",
                al: 1,
                hash: playlist.follow_hash,
                playlist_id: playlist.id,
                playlist_owner_id: playlist.owner_id
            }).catch(reject);

            return resolve(true);
        });
    }

    reorder (params = {}) {

        /*
            playlist_id: number
            prev_playlist_id: number
        */

        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            await this.request({
                act: "reorder_playlist",
                al: 1,
                hash: this.reorderPlaylistHash ? this.reorderPlaylistHash : await this.getReorderHash(),
                owner_id: uid,
                playlist_id: params.playlist_id,
                prev_playlist_id: params.prev_playlist_id
            }).catch(reject);
            
            return resolve(true);
        });
    }
    
    //

    addSong (audio, playlist) {

        /*
            audio: object
            playlist: object
        */

        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            if (!audio || !playlist) return reject(new Error("You must to specify audio and playlist"));

            await this.request({
                act: "save_audio_in_playlists",
                add_pl_ids: playlist.playlist_id,
                al: 1,
                audio_id: audio.id,
                audio_owner_id: audio.owner_id,
                hash: await this.getSaveHash(audio).catch(reject),
                owner_id: uid,
                remove_pl_ids: ""
            }).catch(reject);

            return resolve(true);
        });
    }

    removeSong (audio, playlist) {

        /*
            audio: object
            playlist: object
        */

        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            await this.request({
                act: "save_audio_in_playlists",
                add_pl_ids: "",
                al: 1,
                audio_id: audio.id,
                audio_owner_id: audio.owner_id,
                hash: await this.getSaveHash(audio).catch(reject),
                owner_id: uid,
                remove_pl_ids: playlist.playlist_id
            }).catch(reject);

            return resolve(true);
        });
    }

    reorderSongs (params = {}) {

        /*
            Audios: string (it must be string of full_ids, you can use join() for example, see example in unit-tests)
            playlist_id: number
            force?: boolean (if you really want to clean playlist)
        */

        return new Promise(async (resolve, reject) => {
            if (!params.playlist_id) {
                return reject(new Error("You must to specify playlist_id"));
            }
            
            const uid = this.user_id;

            const playlist = await this.getPlaylist({ playlist_id: params.playlist_id });

            if (!params.Audios && playlist.size > 0 && !params.force) { // Absolute protection :D
                return reject(new Error("I'm not really sure you want to leave the playlist empty. But if you do, specify in params force: true"));
            }
      
            await this.request({
                Audios: params.Audios,
                act: "save_playlist",
                al: 1,
                cover: 0,
                description: playlist.description,
                hash: playlist.edit_hash,
                owner_id: uid,
                playlist_id: params.playlist_id,
                title: playlist.title
            }).catch(reject);
    
            return resolve(true);
        });
    }

    // --------------------------------------- COVER --------------------------------------------------

    uploadCover (path = "") {
        return new Promise(async (resolve, reject) => {
            const url = await this.getUploadCoverURL().catch(reject);
            const file = await this.uploader.uploadFile(url, path, "photo", {}).catch(reject);
            const string = JSON.stringify(file);
            return resolve(string);
        });
    }

    getUploadCoverURL () {
        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            const res = await this.request({ retOnlyBody: true }).catch(reject);
            const [, url] = res.match(/\"url\":\"(.*?)\"/);

            let hash = res.match(/"hash":"(.*?)"/g);
            hash = (hash[0].split(":")[1] || "").replace(/"/g, "");

            const query = encode({
                act: "audio_playlist_cover",
                ajx: 1,
                hash,
                mid: uid,
                upldr: 1
            });

            const complete = new URL(`${url}?${query}`);
            return resolve(complete.href);
        });
    }

    // --------------------------------------- OTHEN --------------------------------------------------

    getNewHash () {
        return new Promise(async (resolve, reject) => {
            const res = await this.request({ retOnlyBody: true }).catch(reject);
            let newPlaylistHash = res.match(/"newPlaylistHash":"(.*?)"/g);
            newPlaylistHash = (newPlaylistHash[0].split(":")[1] || "").replace(/"/g, "");
            return resolve(newPlaylistHash);
        });
    }

    getSaveHash (audio) {
        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            const res = await this.request({
                act: "more_playlists_add",
                al: 1,
                audio_id: audio.id,
                audio_owner_id: audio.owner_id,
                owner_id: uid,
                retOnlyBody: true
            }).catch(reject);

            const matched = res.match(/], '(.*)'/)[1];
            return resolve(matched);
        });
    }

    getReorderHash () {
        return new Promise(async (resolve, reject) => {
            const res = await this.request({ retOnlyBody: true }).catch(reject);
            let reorderHash = res.match(/"reorderHash":"(.*?)"/g);
            reorderHash = (reorderHash[0].split(":")[1] || "").replace(/"/g, "");
            this.reorderPlaylistHash = reorderHash;
            return resolve(reorderHash);
        });
    }
}

module.exports = PlaylistsRequest;