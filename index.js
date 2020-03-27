const HTMLParser = require("node-html-parser");

class AudioAPI {
    constructor (client) {
        this.client = client;
        this.user_id = client._vk.session.user_id;
        this.uploader = client._vk.uploader;

        this.AudioObject = {
            AUDIO_ITEM_INDEX_ID: 0,
            AUDIO_ITEM_INDEX_OWNER_ID: 1,
            AUDIO_ITEM_INDEX_URL: 2,
            AUDIO_ITEM_INDEX_TITLE: 3,
            AUDIO_ITEM_INDEX_PERFORMER: 4,
            AUDIO_ITEM_INDEX_DURATION: 5,
            AUDIO_ITEM_INDEX_ALBUM_ID: 6,
            AUDIO_ITEM_INDEX_AUTHOR_LINK: 8,
            AUDIO_ITEM_INDEX_LYRICS: 9,
            AUDIO_ITEM_INDEX_FLAGS: 10,
            AUDIO_ITEM_INDEX_CONTEXT: 11,
            AUDIO_ITEM_INDEX_EXTRA: 12,
            AUDIO_ITEM_INDEX_HASHES: 13,
            AUDIO_ITEM_INDEX_COVER_URL: 14,
            AUDIO_ITEM_INDEX_ADS: 15,
            AUDIO_ITEM_INDEX_SUBTITLE: 16,
            AUDIO_ITEM_INDEX_MAIN_ARTISTS: 17,
            AUDIO_ITEM_INDEX_FEAT_ARTISTS: 18,
            AUDIO_ITEM_INDEX_ALBUM: 19,
            AUDIO_ITEM_INDEX_TRACK_CODE: 20,
            AUDIO_ITEM_CAN_ADD_BIT: 2,
            AUDIO_ITEM_CLAIMED_BIT: 4,
            AUDIO_ITEM_HQ_BIT: 16,
            AUDIO_ITEM_LONG_PERFORMER_BIT: 32,
            AUDIO_ITEM_UMA_BIT: 128,
            AUDIO_ITEM_REPLACEABLE: 512,
            AUDIO_ITEM_EXPLICIT_BIT: 1024,
            AUDIO_ITEM_INDEX_RESTRICTION: 21
        };

        this.genres = {
            1: "Rock",
            2: "Pop",
            3: "Rap & Hip-Hop",
            4: "Easy Listening",
            5: "Dance & House",
            6: "Instrumental",
            7: "Metal",
            8: "Dubstep",
            10: "Drum & Bass",
            11: "Trance",
            12: "Chanson",
            13: "Ethnic",
            14: "Acoustic & Vocal",
            15: "Reggae",
            16: "Classical",
            17: "Indie Pop",
            18: "Other",
            19: "Speech",
            21: "Alternative",
            22: "Electropop & Disco",
            1001: "Jazz & Blues"
        };
    }

    // --------------------- API ----------------------

    async request (params, post = true, isMobile = false, file = "al_audio.php") {
        return await this.client.request(file, params, post, isMobile); 
    }

    // --------------------- VK ----------------------

    UnmuskTokenAudio (e, vkId = 1) {
        const n = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0PQRSTUVWXYZO123456789+/=";

        const s = (e, t) => {
            const { length: n } = e;
            const i = [];
            if(n) {
                let o = n;
                for (t = Math.abs(t); true;) {
                    o -= 1;
                    if(o < 0) break;
                    t = ((n * o + n) ^ t + o) % n;
                    i[o] = t;
                }
            } return i;
        };

        const i = {
            v: e => e.split("").reverse().join(""),
            r: (e, t) => {
                e = e.split("");
                for (let i, o = n + n, r = e.length; r; r--) {
                    o.indexOf(e[r]);
                    i = ~i && (e[r] = o.substr(i - t, 1));
                }
                return e.join("");
            },
            s: (e, t) => {
                const { length: n } = e;
                if(n) {
                    const i = s(e, t);
                    let o = 0;
                    for (e = e.split(""); ++o < n;) e[o] = e.splice(i[n - 1 - o], 1, e[o])[0];
                    e = e.join("");
                } return e;
            },
            i: (e, t) => i.s(e, t ^ vkId),
            x: (e, t) => {
                let n = [];
                t = t.charCodeAt(0);
                e.split("").forEach((e, i) => n = [...n, String.fromCharCode(i.charCodeAt(0) ^ t)]);
                return n.join("");
            }
        };

        const o = () => false;

        const a = e => {
            if (!e || e.length % 4 === 1) return !1;
            for (var t, i, o = 0, r = 0, a = ""; true;) {
                i = e.charAt(r++);
                if (!i) break;

                i = n.indexOf(i);
                i = ~i && (t = o % 4 ? 64 * t + i : i, o++ % 4) && (a += String.fromCharCode(255 & t >> (-2 * o & 6)));
            }
            return a;
        };

        const r = e => {
            if(!o() && ~e.indexOf("audio_api_unavailable")) {
                const splitted = e.split("?extra=")[1];
                let t = splitted ? splitted.split("#") : e.split("?extra")[0];
                const alter = splitted ? t[1] : t[0];

                let n = !alter.length ? "" : a(alter);
                t = a(t[0]);
                if(typeof n !== "string" || !t) return e;
                n = n ? n.split(String.fromCharCode(9)) : [];
                for (let r, s, l = n.length; l--;) {
                    s = n[l].split(String.fromCharCode(11));
                    r = s.splice(0, 1, t)[0];
                    if (!i[r]) return e;
                    t = i[r].apply(null, s);
                }
                if (t && t.substr(0, 4) === "http") return t;
            } return e;
        };

        return r(e);
    }

    getURL (token) { return this.UnmuskTokenAudio(token); }

    // --------------------- OBJECTS ----------------------

    getNormalAudios (audios) {
        return new Promise(resolve => {
            if(audios) {
                const audios_ = new Array(audios.length);
                let withoutURL = [];
    
                for (let i = 0; i < audios.length; i++) {
                    const audio = audios[i];
                    if (!audio[this.AudioObject.AUDIO_ITEM_INDEX_URL] && !audio[this.AudioObject.AUDIO_ITEM_INDEX_RESTRICTION]) withoutURL = [...withoutURL, i];
                    else audios_[i] = this.getAudioAsObject(audio);
                }
    
                const nextAudios = async () => {
                    const _audioWithoutURL = withoutURL.splice(0, 10);
                    const __audioWithoutURL = _audioWithoutURL.slice(0, _audioWithoutURL.length);
                    for (let i = 0; i < _audioWithoutURL.length; i++)
                        __audioWithoutURL[i] = this.getAdi(audios[_audioWithoutURL[i]]).join("_");
      
                    const _audios = await this.getById({ ids: __audioWithoutURL.join(",") });
    
                    for (let i = 0; i < _audios.length; i++)
                        audios_[_audioWithoutURL[i]] = this.getAudioAsObject(_audios[i]);
    
                    if (withoutURL.length) setTimeout(nextAudios, 300);
                    else {
                        let endAudios = [];
    
                        for (let i = 0; i < audios_.length; i++)
                            if(audios_[i])
                                endAudios = [...endAudios, audios_[i]];
                  
                        resolve(endAudios);
                    }
                };
      
                if (withoutURL.length) nextAudios();
                else resolve(audios_);
            }
        });
    }


    getAudioAsObject (audio = []) {
        const source = this.UnmuskTokenAudio(audio[this.AudioObject.AUDIO_ITEM_INDEX_URL], this.user_id);
    
        const getAudioWithURL = async () => {
            const { json } = await this.getById({ ids: this._getAdi(audio).join("_") }).catch(() => null);
            return this._getAudioAsObject(json[0]);
        };
    
        if ((!source || !source.length) && !audio[this.AudioObject.AUDIO_ITEM_INDEX_RESTRICTION]) return getAudioWithURL();
    
        const e = (audio[this.AudioObject.AUDIO_ITEM_INDEX_HASHES] || "").split("/"),
            c = (audio[this.AudioObject.AUDIO_ITEM_INDEX_COVER_URL] || ""),
            cl = c.split(",");
    
        const audio_ = {
            id: audio[this.AudioObject.AUDIO_ITEM_INDEX_ID],
            owner_id: audio[this.AudioObject.AUDIO_ITEM_INDEX_OWNER_ID],
            url: source,
            title: audio[this.AudioObject.AUDIO_ITEM_INDEX_TITLE],
            performer: audio[this.AudioObject.AUDIO_ITEM_INDEX_PERFORMER],
            duration: audio[this.AudioObject.AUDIO_ITEM_INDEX_DURATION],
            covers: c,
            is_restriction: !!audio[this.AudioObject.AUDIO_ITEM_INDEX_RESTRICTION],
            extra: audio[this.AudioObject.AUDIO_ITEM_INDEX_EXTRA],
            coverUrl_s: cl[0] || "",
            coverUrl_p: cl[1] || "",
            flags: audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS],
            hq: !!(audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS] & this.AudioObject.AUDIO_ITEM_HQ_BIT),
            claimed: !!(audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS] & this.AudioObject.AUDIO_ITEM_CLAIMED_BIT),
            uma: !!(audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS] & this.AudioObject.AUDIO_ITEM_UMA_BIT),
            album_id: audio[this.AudioObject.AUDIO_ITEM_INDEX_ALBUM_ID],
            full_id: `${audio[this.AudioObject.AUDIO_ITEM_INDEX_OWNER_ID]}_${audio[this.AudioObject.AUDIO_ITEM_INDEX_ID]}`,
            explicit: !!(audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS] & this.AudioObject.AUDIO_ITEM_EXPLICIT_BIT),
            subtitle: audio[this.AudioObject.AUDIO_ITEM_INDEX_SUBTITLE],
            add_hash: e[0] || "",
            edit_hash: e[1] || "",
            action_hash: e[2] || "",
            delete_hash: e[3] || "",
            replace_hash: e[4] || "",
            can_edit: !!e[1],
            can_delete: !!e[3],
            can_add: !!(audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS] & this.AudioObject.AUDIO_ITEM_CAN_ADD_BIT),
            track_code: audio[this.AudioObject.AUDIO_ITEM_INDEX_TRACK_CODE],
            ads: audio[this.AudioObject.AUDIO_ITEM_INDEX_ADS],
            album: audio[this.AudioObject.AUDIO_ITEM_INDEX_ALBUM],
            replaceable: !!(audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS] & this.AudioObject.AUDIO_ITEM_REPLACEABLE),
            context: audio[this.AudioObject.AUDIO_ITEM_INDEX_CONTEXT]
        };
    
        if (audio[9]) audio_.lyrics_id = audio[9];
        return audio_;
    }

    getAdi (audio) {
        const adi = [audio[1], audio[0]],
            e = audio[13].split("/");
    
        const actionHash = e[2] || "",
            otherHash  = e[5] || "";
    
        if(actionHash) adi[2] = actionHash;
        if(otherHash)  adi[3] = otherHash;
    
        return adi;
    }

    getPlaylistAsObject (playlist) {
        const covers = this.matchAll(playlist.grid_covers, /background-image:url\(\'(.*?)\'\)/, false);
        return {
            id: playlist.id,
            owner_id: playlist.owner_id || playlist.ownerId,
            raw_id: playlist.raw_id,
            title: playlist.title,
            cover_url: playlist.thumb || "",
            last_updated: playlist.last_updated,
            explicit: playlist.is_explicit,
            followed: playlist.is_followed,
            official: playlist.is_official,
            listens: playlist.listens,
            size: playlist.size || playlist.totalCount,
            follow_hash: playlist.follow_hash,
            covers: covers.length ? covers : "",
            description: playlist.description,
            context: playlist.context,
            access_hash: playlist.access_hash || playlist.accessHash || "",
            playlist_id: playlist.id
        };
    }

    getPlaylistInfo (playlist) {
        const covers = this.matchAll(playlist.gridCovers, /background-image:url\(\'(.*?)\'\)/, false);
        return {
            id: playlist.id,
            owner_id: playlist.ownerId,
            raw_id: `${playlist.ownerId}_${playlist.id}`,
            title: playlist.title,
            cover_url: playlist.coverUrl,
            last_updated: playlist.lastUpdated,
            explicit: playlist.isExplicit,
            followed: playlist.isFollowed,
            official: playlist.isOfficial,
            listens: playlist.listens,
            size: playlist.totalCount,
            follow_hash: playlist.followHash,
            edit_hash: playlist.editHash,
            covers,
            description: playlist.description,
            raw_description: playlist.rawDescription,
            context: playlist.context,
            access_hash: playlist.accessHash,
            playlist_id: playlist.id
        };
    }

    // --------------------- AUDIOS ----------------------

    get (params = {}) {
        return new Promise(async (resolve, reject) => {
            const owner_id = params.owner_id ? Number(params.owner_id) : this.user_id;
            const playlist_id = params.playlist_id ? Number(params.playlist_id) : -1;
            const offset = params.offset ? Number(params.offset) : 0;
            
            const res = await this.request({
                access_hash: "",
                act: "load_section",
                al: 1,
                claim: 0,
                owner_id,
                playlist_id,
                offset, 
                type: "playlist",
                track_type: "default"
            }).catch(reject);

            const { list, totalCount: count } = res.payload[1][0];
            const audios = await this.getNormalAudios(list);
            return resolve({ audios, count });
        });
    }

    getCount (params = {}) {
        return new Promise(async (resolve, reject) => {
            const { count } = await this.get(params).catch(reject);
            return resolve(count);
        });
    }

    getById (params = {}) {
        return new Promise(async resolve => {
    
            const doRequest = async () => {
                return await this.request({
                    act: "reload_audio",
                    al: 1,
                    ids: params.ids
                });
            };
    
            let res = await doRequest();
            if(!res.payload[1][0]) {
                await new Promise(resolve => {
                    const attempt = async () => {
                        const _res = await doRequest();
                        if(_res.payload[1][0]) {
                            res = _res;
                            return resolve(_res);
                        } else return setTimeout(attempt, 5000);
                    }; return attempt(); 
                });
            }
    
            return resolve(res.payload[1][0]);
        });
    }

    // --------------------- AUDIOS ACTIONS ----------------------

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

            const _audio = await this.getNormalAudios([res.payload[1][0]]);
            return resolve(_audio[0]);
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
            const _audio = await this.getNormalAudios([res]);
            return resolve(_audio);
        });
    }

    getReorderHash () {
        return new Promise(async (resolve, reject) => {
            const res = await this.request({ retOnlyBody: true }, false).catch(reject);
            
            let reorderHash = res.match(/"audiosReorderHash":"(.*?)"/g);
            reorderHash = (reorderHash[0].split(":")[1] || "").replace(/"/g, "");
            this.reorderHash = reorderHash;

            return resolve(reorderHash);
        });
    }

    reorder (params = {}) {
        return new Promise(async (resolve, reject) => {
            await this.request({
                act: "reorder_audios",
                al: 1,
                audio_id: params.audio_id || -1,
                hash: this.reorderHash || await this.getReorderHash() || "",
                next_audio_id: params.next_audio_id || 0,
                owner_id: params.owner_id || this.user_id || 0
            }).catch(reject);
            return resolve(true);
        });
    }

    // --------------------- PLAYLISTS ----------------------

    getPlaylist (params = {}) {

        /*
            owner_id: number
            playlist_id: number
            list?: boolean
            Access Hash forces list = true automatically if you want to load third-party playlists (general page or search for example)
        */

        return new Promise(async (resolve, reject) => {
            if (!~params.playlist_id) return reject(new Error("You must to specify playlist_id"));
            if (!params.owner_id) params.owner_id = this.user_id;

            if (params.access_hash) params.list = true;

            const isMy = params.owner_id === this.user_id;

            let context = isMy ? "my" : "user_playlists";
            if (params.owner_id < 0) context = "group_list";

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

            if (params.list)
                playlist.list = await this.getNormalAudios(_p.list);

            return resolve(playlist);
        });
    }

    getPlaylistById (params = {}) {

        /*
            access_hash?: string
            owner_id?: number
            playlist_id: number
            list: boolean
        */

        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            if (!params.playlist_id) return reject(new Error("You must to specify playlist_id"));

            const res = await this.request({
                access_hash: params.access_hash || "",
                act: "load_section",
                al: 1,
                claim: 0,
                from_id: uid,
                is_loading_all: 1,
                offset: 0,
                owner_id: params.owner_id || uid,
                playlist_id: params.playlist_id,
                type: "playlist"
            });

            const payload = res.payload[1][0];
            if (!payload) return reject(new Error("getPlaylistById error"));
            const playlist = this.getPlaylistInfo(payload);
            if (params.list) playlist.list = await this.getNormalAudios(payload.list);
            return resolve(playlist);
        });
    }

    getPlaylists (params = {}) {
        return new Promise(async (resolve, reject) => {
            const res = await this.request({
                access_hash: params.access_hash ? params.access_hash : "",
                act: "owner_playlists",
                al: 1,
                is_attach: 0,
                offset: params.offset || 0,
                owner_id: params.owner_id || this.user_id,
                isPlaylist: true
            });
            if(res === "\"Access denied\"") return reject(new Error("Access Denied"));
            const payload = res.payload[1][0];
            
            let playlists = [];
    
            for (let i = 0; i < payload.length; i++)
                playlists = [...playlists, this.getPlaylistAsObject(payload[i])];
              
            return resolve(playlists);
        });
    }

    getPlaylistsByType (params = {}) {

        /*
            type: string
        */

        return new Promise(async (resolve, reject) => {
            String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };

            if (!params.type) return reject(new Error("You must to specify type"));

            const res = await this.request({
                section: "recoms_block",
                type: params.type
            }).catch(reject);

            let playlists = [];

            const root = HTMLParser.parse(res.body);
            const pl_objects = root.querySelectorAll(".audio_pl_item2");

            for(const playlist of pl_objects) {   
                const raw = playlist.childNodes[1].rawAttrs;
                const match = raw.match(/showAudioPlaylist\((.*),/)[1];
                const split = match.split(", ");
                const owner_id = split[0];
                const playlist_id = split[1];
                const subtitle = playlist.childNodes[3].childNodes[3].childNodes[0].childNodes[0].rawText;
                const title = playlist.childNodes[3].childNodes[1].childNodes[1].rawText;
                const cover = playlist.childNodes[1].rawAttrs.match(/background-image: url\(\'(.*)\'\)/)[1];

                let access_hash = split[2];
                if(access_hash.length) access_hash = access_hash.replaceAll("'", "");

                let genre = split[3];
                genre = genre.replace("genre_", "");
                genre = genre.replaceAll("'", "");
                genre = genre.charAt(0).toUpperCase() + genre.substring(1, genre.length);
      
                const _playlist = { access_hash, owner_id, playlist_id, cover, title, subtitle, genre, raw_id: `${owner_id}_${playlist_id}` };
                playlists = [...playlists, _playlist];
            }

            return resolve(playlists);
        });
    }

    getFriendsNew () {
        const uid = this.user_id;
        return new Promise(async (resolve, reject) => {
            const res = await this.request({
                act: "section",
                al: 1,
                claim: 0,
                is_layer: 0,
                owner_id: uid,
                section: "updates"
            }).catch(reject);
            const list = res.payload[1][1].feedPlaylist.list;
            const audios = await this.getNormalAudios(list);
            return resolve(audios);
        });
    }

    // --------------------- PLAYLISTS ACTIONS ----------------------

    savePlaylistHash (audio) {
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

    addToPlaylist (audio, playlist) {

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
                hash: await this.savePlaylistHash(audio).catch(reject),
                owner_id: uid,
                remove_pl_ids: ""
            }).catch(reject);

            return resolve(true);
        });
    }

    removeFromPlaylist (audio, playlist) {

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
                hash: await this.savePlaylistHash(audio).catch(reject),
                owner_id: uid,
                remove_pl_ids: playlist.playlist_id
            }).catch(reject);

            return resolve(true);
        });
    }

    getPlaylistCoverUploadURL () {
        String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };
        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            const res = await this.request({ retOnlyBody: true }).catch(reject);
            const url = this.matchAll(res, /\"url\":\"(.*?)\"/, false)[0].replaceAll("\\", "");
            let hash = res.match(/"hash":"(.*?)"/g);
            hash = (hash[0].split(":")[1] || "").replace(/"/g, "");
            const completeURL = `${url}?act=audio_playlist_cover&ajx=1&hash=${hash}&mid=${uid}&upldr=1`;
            return resolve(completeURL);
        });
    }

    getNewPlaylistHash () {
        return new Promise(async (resolve, reject) => {
            const res = await this.request({ retOnlyBody: true }).catch(reject);
            let newPlaylistHash = res.match(/"newPlaylistHash":"(.*?)"/g);
            newPlaylistHash = (newPlaylistHash[0].split(":")[1] || "").replace(/"/g, "");
            return resolve(newPlaylistHash);
        });
    }

    uploadCover (path = "") {
        return new Promise(async (resolve, reject) => {
            const url = await this.getPlaylistCoverUploadURL().catch(reject);
            const file = await this.uploader.uploadFile(url, path, "photo", {}).catch(reject);
            return resolve(JSON.stringify(file));
        });
    }

    createPlaylist (params = {}) {

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
                hash: await this.getNewPlaylistHash(),
                owner_id: uid,
                playlist_id: 0,
                title: params.title,
                isPlaylist: true
            }).catch(reject);

            const playlist = this.getPlaylistAsObject(res);
            return resolve(playlist);
        });
    }

    editPlaylist (params = {}) {

        /*
            playlist_id: number
        */

        const uid = this.user_id;
        return new Promise(async (resolve, reject) => {
            if (!params.playlist_id) return reject(new Error("You must to specify playlist"));

            const playlist = await this.getPlaylist({
                playlist_id: params.playlist_id,
                list: true
            }).catch(reject);

            const { edit_hash, list } = playlist;

            const title = params.title !== null ? params.title : playlist.title;
            const description = params.description !== null ? params.description : playlist.description;
            const cover = params.cover !== null ? await this.uploadCover(params.cover).catch(reject) : 0;

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

    deletePlaylist (playlist = {}) {
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
    
    followPlaylist (playlist = {}) {

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

    getReorderPlaylistsHash () {
        return new Promise(async (resolve, reject) => {
            const res = await this.request({ retOnlyBody: true }).catch(reject);
            let reorderHash = res.match(/"reorderHash":"(.*?)"/g);
            reorderHash = (reorderHash[0].split(":")[1] || "").replace(/"/g, "");
            this.reorderPlaylistHash = reorderHash;
            return resolve(reorderHash);
        });
    }

    reorderPlaylists (params = {}) {

        /*
            playlist_id: number
            prev_playlist_id: number
        */

        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            await this.request({
                act: "reorder_playlist",
                al: 1,
                hash: this.reorderPlaylistHash ? this.reorderPlaylistHash : await this.getReorderPlaylistsHash(),
                owner_id: uid,
                playlist_id: params.playlist_id,
                prev_playlist_id: params.prev_playlist_id
            }).catch(reject);
            
            return resolve(true);
        });
    }

    reorderSongsInPlaylist (params = {}) {

        /*
            Audios: string (it must be string of full_ids, you can use join() for example, see example in unit-tests)
            playlist_id: number
            force?: boolean (if you really want to clean playlist)
        */

        return new Promise(async (resolve, reject) => {
            if (!params.playlist_id) return reject(new Error("You must to specify playlist_id"));
            
            const uid = this.user_id;

            const playlist = await this.getPlaylist({ playlist_id: params.playlist_id });

            if (!params.Audios && playlist.size > 0 && !params.force) // Absolute protection :D
                return reject(new Error("I'm not really sure you want to leave the playlist empty. But if you do, specify in params force: true"));
      
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

    // --------------------- RECOMS ----------------------

    getPlaylistByHTML (playlist) {
        String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };
        const info = playlist.childNodes[0];
        const raw = info.rawAttrs;
    
        const bod = HTMLParser.parse(playlist.innerHTML);
        const title_object = bod.querySelector(".audio_pl__title");
        const title = title_object.text.replaceAll("\n", "").trim();
    
        const cover = raw.match(/background-image: url\(\'(.*)\'\)/)[1];
        const match = raw.match(/showAudioPlaylist\((.*),/)[1];
        const split = match.split(", ");
        const owner_id = split[0], 
            playlist_id = split[1], 
            access_hash = split[2] == "''" ? "" : split[2].replaceAll("'", "");
    
        const _r = split[3].match(/(.*?):/)[1];
        let _g = "";
        try { _g = split[3].match(/:(.*?)_/)[1]; } catch(e) { _g = split[3]; }
        let genre = split[3].replace(_r + ":", "").replace(_g + "_", "");
        genre = genre.replaceAll("'", "");
        genre = genre.charAt(0).toUpperCase() + genre.substring(1, genre.length);
        return { access_hash, owner_id, playlist_id, cover, title, genre, raw_id: `${owner_id}_${playlist_id}` };
    }

    getGenreByHTML (html) {
        const root = HTMLParser.parse(html);
        const inner = root.querySelectorAll(".CatalogBlock");
        let pl_objects = [];
        let code = "";
        for (const inner_object of inner) {
            try { 
                const inner_parsed = HTMLParser.parse(inner_object.innerHTML);
                code = inner_parsed.innerHTML.match(/type=(.*?)\"/)[1];
                pl_objects = inner_parsed.querySelectorAll(".audio_pl_item2");
            } catch(e) { return []; }
        }
        const genres = {};
        for (const object of pl_objects) {
            const dom = HTMLParser.parse(object.innerHTML);
            if (!dom.childNodes[0]) continue;
            const playlist = this.getPlaylistByHTML(dom);
            const { genre } = playlist;
            if (!genres[genre]) genres[genre] = { code, playlists: [] };
            genres[genre].playlists = [...genres[genre].playlists, playlist];
        }
        return genres;
    }

    loadRecoms (code = "") {
        const uid = this.user_id;
    
        return new Promise(async (resolve, reject) => {
            const res = await this.request({
                section: "recoms_block",
                type: code,
                retOnlyBody: true
            }, true, false, `/audios${uid}`).catch(reject);
            
            const matches = this.getAudiosFromHTML(res, /data-audio=\"(.*?)\"/, true);
            return resolve(await this.getNormalAudios(matches));
        });
    }

    loadNewReleases (params = {}) {

        /*
            max?: number = 6
        */

        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            const res = await this.request({
                act: "section",
                al: 1,
                claim: 0,
                is_layer: 0,
                owner_id: uid,
                section: "recoms"
            }).catch(reject);

            const html = res.payload[1][0];
            const payload = res.payload[1][1];
            const { sectionId } = payload;
            const next_from = payload.next_from || payload.nextFrom;

            let many_playlists = this.getGenreByHTML(html);
            
            const _add = await this.request({
                act: "load_catalog_section",
                al: 1,
                section_id: sectionId,
                start_from: next_from
            }, true).catch(reject);

            const catalogs = _add.payload[1][0];
            for (const _c of catalogs) {
                const build = this.getGenreByHTML(_c);
                many_playlists = Object.assign(many_playlists, build);
            }

            const { playlist: charts_playlist } = payload;

            const max = params.max || 6;

            const _c_audios = charts_playlist.list.length > max ? charts_playlist.list.splice(0, max) : charts_playlist.list;

            const charts = {
                id: charts_playlist.id,
                audios: await this.getNormalAudios(_c_audios).catch(reject)
            };

            const dom = res.payload[1][0];
            const types = this.matchAll(dom, /type=(.*?)\"/);
            const recoms_code = types[0];

            const _r = await this.loadRecoms(recoms_code).catch(reject);
            const _r_audios = _r.length > 10 ? _r.splice(0, 10) : _r;
        
            const recoms = {
                id: types[0],
                audios: _r_audios
            };
        
            const _n = this.matchAll(dom, /data-audio=\"(.*?)\"/, true);
            const _n_audios = _n.length > max ? _n.splice(0, max) : _n;

            const _new = {
                id: types[1],
                audios: await this.getNormalAudios(_n_audios).catch(reject)
            };

            return resolve({ recoms, new: _new, charts, many_playlists });
        });
    }

    loadAudioPage (params = {}) {

        /*
            type: string
        */

        return new Promise(async (resolve, reject) => {
            if (!params.type) return reject(new Error("You must to specify type"));
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
    
    // --------------------- STATUS ----------------------

    getStatusExportHash () {
        return new Promise(async resolve => {
            const res = await this.request({ retOnlyBody: true }, false);
            const hash = res.match(/statusExportHash: \'(.*?)\'/)[1];
            this.statusExportHash = hash;
            return resolve(hash);
        });
    }

    toggleAudioStatus (params = {}) {

        /*
            enable: boolean
            raw_audio_id: string
            owner_id?: number
        */

        return new Promise(async (resolve ,reject) => {
            await this.request({
                act: "toggle_status",
                al: 1,
                exp: params.enable !== false ? 1 : 0,
                hash: this.statusExportHash || await this.getStatusExportHash(),
                id: params.raw_audio_id,
                oid: params.owner_id ? Number(params.owner_id) : this.user_id,
                top: 0
            }).catch(reject);
            
            return resolve(true);
        });
    }
    
    changeAudioStatus (params = {}) {

        /*
            raw_audio_id: string
        */

        return new Promise(async (resolve, reject) => {
            await this.request({
                act: "audio_status",
                al: 1,
                hash: this.statusExportHash || await this.getStatusExportHash(),
                full_id: params.raw_audio_id,
                top: 0
            }).catch(reject);
            
            return resolve(true);
        });
    }

    // --------------------- MISC ----------------------
    matchAll (html, regex, to_json = false) {
        String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };
        let ready = [];
        let match = regex.exec(html);
        while(match != null) {
            html = html.replace(match[0], "");
            match[1] = match[1].replaceAll("&quot;", "\"").replaceAll("\\\"", "").replaceAll("& quot;", "\"");
            if (to_json) ready = [...ready, JSON.parse(match[1])];
            else ready = [...ready, match[1]];
            match = regex.exec(html);
        }
        return ready;
    }

    getAudiosFromHTML (html, regex = /data-audio=\"(.*?)\"/, to_json = true) {
        String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };
        let matches = [];
        let match = regex.exec(html);

        const push = data => {
            if(to_json) {
                try { matches = [...matches, JSON.parse(data)]; }
                catch(e) { throw e; }
            }
            else matches = [...matches, data];
        };

        while(match != null) {
            html = html.replace(match[0], "");
            let temp = "";
            try {
                temp = match[1];
                push(match[1]);
            } catch (e) {
                try {
                    match[1] = match[1].replaceAll("&quot;", "\"").replaceAll("\\\"", "").replace("\\recom\\", "recom").replace("\\hash\\:\\", "hash:").replace("\\}}", "}}");
                    match[1] = match[1].replaceAll("\\", "");
                    push(match[1]);
                } catch (e1) {
                    try { // Tryhard with regex
                        const _match = html.match(/data-audio=\"(.*?)\">n/);
                        push(_match[1]);
                    } catch(e2) { console.log("to validate:", temp); }
                }
            }
            match = regex.exec(html);
        } 
        return matches;
    }

    // --------------------- ARTISTS ----------------------------------------

    getArtist (artist) {
        String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };
        return new Promise(async (resolve, reject) => {
            if (!artist) return reject(new Error("Null artist is not acceptable"));
            artist = artist.toLowerCase();
            let { html } = await this.request({}, true, true, `/artist/${artist}`);
            html = html.replaceAll("\\", "").replaceAll("& quot;", "\"").replaceAll("&quot;", "\"").replaceAll("&#39;", "\"");

            try {
                let artist_name = null;
                try { artist_name = html.match(/title\":\"(.*?)\",\"/)[1]; }
                catch(e) { artist_name = html.match(/header__text\">(.*?)</)[1]; } 
    
                const matches = this.getAudiosFromHTML(html, /data-audio=\"(.*?)\">/);
                const audios = await this.getNormalAudios(matches);
                const playlists = this.buildPlaylists(html);
      
                let cover_url = "";
                try { cover_url = html.match(/background-image: url\(\"(.*?)\"\)/)[1]; } catch(e) { console.log(e); }
                return resolve({ artist_name, link: artist, cover_url, audios, playlists });
            } catch(e) { return reject(new Error("Can't open the artist")); }
        });
    }

    // --------------------- BUILD OBJECTS FROM SEARCH ----------------------
    
    buildPlaylists (res) {
        String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };
        const html = res.replaceAll("\\", "");
        const root = HTMLParser.parse(html);
        let pl_objects = root.querySelectorAll(".audioPlaylists__item");
        if(!pl_objects.length) pl_objects = root.querySelectorAll(".audioPlaylists__itemLink");
        if(!pl_objects.length) return;
        
        const getPlaylist = element => {
            let html = element.outerHTML;
          
            try {
                const raw_id = html.match(/audio_playlist-(.*?)&/)[1];
                const split = raw_id.split("_");
                const owner_id = split[0], playlist_id = split[1];
                const access_hash = html.match(/access_hash=(.*?)&/)[1];
                const cover_url = html.match(/background-image: url\('(.*?)'\)/)[1];
                const title = html.match(/__itemTitle\">(.*?)<\/span>/)[1];
                let subtitle_match = html.match(/__itemSubtitle\">(.*?)<\/div>/);
                const subtitle = subtitle_match[1];
                let year = null;
                try {
                    html = html.replace(subtitle_match[0], "");
                    subtitle_match = html.match(/__itemSubtitle\">(.*?)<\/div>/);
                    year = subtitle_match[1];
                } catch(e) { console.log(e); }
    
                return { access_hash, owner_id, playlist_id, raw_id, cover_url, title, subtitle, year };
            } catch(e) { return { error: true }; }
        };
    
        let playlists = [];
        for(const playlist of pl_objects) {
            const builded = getPlaylist(playlist);
            if(!builded.error) playlists = [...playlists, builded];
        }
        
        return playlists;
    }

    buildArtists (res) {
        String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };
        const html = res.replaceAll("\\", "");
        const root = HTMLParser.parse(html);
        const a_objects = root.querySelectorAll(".OwnerRow_artist");
        
        const getArtist = element => {
            const html = element.innerHTML.replaceAll("&#39;", "\"");
            try {
                let link = null;
                try { link = html.match(/href=\"https:\/\/m.vk.com\/artist\/(.*?)\"/)[1]; } 
                catch(e) { link = html.match(/\"\/artist\/(.*?)\"/)[1]; }
                let image = "";
                try { image = html.match(/background-image: url\(\"(.*?)\"\)/)[1]; }
                catch(e) { image = ""; }
                return { link, label: element.text, image };
            } catch(e) { console.log(e); }
        };

        let artists = [];
        for(const artist of a_objects) artists = [...artists, getArtist(artist)];

        return artists;
    }

    buildAudios (res) {
        String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };
        return new Promise(async resolve => {
            let matches = null;
            const cursors = {};
            try {
                let href = null;
                try { href = res.match(/All music(.*)\\\/audio\?act=block(.*?)"/)[2];
                } catch(e) { href = res.match(/All music(.*)\"\/audio\?act=block(.*?)"/)[2]; }
                href = href.replaceAll("&amp;", "&").replaceAll("\\", "");
                const url = `/audio?act=block${href}`;
                cursors.audios = { url };
                const { html } = await this.request({ _ref: "audio" }, true, true, url);
                matches = this.getAudiosFromHTML(html);
            } catch(e) { matches = this.getAudiosFromHTML(res); }
    
            const audios = await this.getNormalAudios(matches);
            audios.forEach(a => {
                a.can_edit = false;
                a.action_hash = a.action_hash.replaceAll("\\", "");
                a.add_hash = a.add_hash.replaceAll("\\", "");
                return a;
            });

            return resolve({ audios, cursors });
        });
    }

    // --------------------- SEARCH ----------------------

    search (params = {}) {
        return new Promise(async (resolve, reject) => {
            if (!params.q) return reject(new Error("You must to specify search value"));

            const res = await this.request({
                q: params.q,
                _ajax: 1
            }, true, true, "audio");

            if (!res.data || !res.data[0]) return reject(new Error("Search error"));

            const body = res.data[0];

            const artists = this.buildArtists(body);
            const playlists = this.buildPlaylists(body);
            const { audios, cursors } = await this.buildAudios(body);

            return resolve({ audios, playlists, artists, cursors });
        });
    }

    searchMore (url, params = {}) {
        const { url: form_url, offset, cursor } = params;
        if(!url || !url.length) url = form_url;
        return new Promise(async resolve => {
            const more = await this.request({
                url: form_url,
                _ajax: 1,
                offset, 
                next_from: cursor
            }, true, true, url);
          
            try {
                const json = JSON.parse(more.body);
    
                const _temp = Object.values(json.data[0]).map(d => d[1]);
                let audios = await this.getNormalAudios(_temp);
                audios = JSON.parse(JSON.stringify(audios));
                audios.forEach(a => {
                    a.can_edit = false;
                    return a;
                });
      
                return resolve({
                    list: audios,
                    next: json.data[2] || null
                });
            } catch(e) {
                return resolve({ list: [], next: null });
            }
        });
    }

    async searchMorePlaylists (url, params = {}) {
        const { url: form_url, offset, cursor } = params;
        if(!url || !url.length) url = form_url;
        return new Promise(async (resolve, reject) => {
            const more = await this.request({
                url: form_url,
                _ajax: 1,
                offset, 
                next_from: cursor
            }, false, true, url);
            more.body = more.body.replaceAll("\\", "").replaceAll("& quot;", "\"").replaceAll("&quot;", "\"").replaceAll("&#39;", "\"");
          
            const next = more.body.match(/(.*],?),(.*)\"\],"version/)[2].replace("\"", "");
    
            try {
                const HTMLParser = require("../../../node-html-parser");
                const matches = this.getAudiosFromHTML(more.body, /\"<div (.*?)\"]/, false);
    
                const buildPlaylist = element => {
                    const html = element.innerHTML;
                    try {
                        const raw_id      = html.match(/audio_playlist(.*?)&/)[1];
                        const split       = raw_id.split("_");
                        const owner_id    = split[0],
                            playlist_id = split[1];
    
                        const access_hash = html.match(/access_hash=(.*?)\"/)[1];
                        const cover_url   = html.match(/background-image: url\(\'(.*?)\'/)[1];
                        const title       = html.match(/al_playlist\">(.*?)</)[1];
    
                        let subtitle = "", year = "";
                        try {
                            const subtitle_match = html.match(/__stats\">(.*?)<(.*?)<\/span>(.*?)</);
                            subtitle             = subtitle_match[1],
                            year                 = subtitle_match[3].trim() != "n" ? subtitle_match[3] : "";
                        } catch(e) { console.log(e); }
                        return { access_hash, owner_id, playlist_id, raw_id, cover_url, title, subtitle, year };
                    } catch(e) { return reject(new Error(e)); }
                };
    
                let playlists = [];
                for(let m of matches) {
                    m = `<div ${m}`;
                    const root = HTMLParser.parse(m);
                    const pl_object = root.querySelectorAll(".audioPlaylistsPage__item");
                    const build = buildPlaylist(pl_object[0]);
                    if(!build.error) playlists = [...playlists, build];
                } 
            
                return resolve({
                    list: playlists,
                    next: next || "nothing"
                });

            } catch(e) { console.log(e); return resolve([]); }
        });
    }

    async searchHints (q = "") {
        if(!q) return;
        
        return new Promise(async (resolve, reject) => {
            const res = await this.request({
                act: "a_gsearch_hints",
                al: 1,
                q,
                section: "audio"
            }, true, false, "hints.php").catch(reject);

            try {
                const payload = res.payload[1][0];
                if (!payload) return reject(new Error("Search hints is broken"));
                const map = payload.map(r => [ r[1], r[3] ]);
                return resolve(map);
            }
            catch(e) { return resolve([]); }
        });
    }

    searchInAudios (params) {
        if(!params.q) return;
        
        return new Promise(async (resolve, reject) => {
            const owner_id = params.owner_id || this.user_id;
            let res = await this.request({
                act: "section",
                al: 1,
                claim: 0,
                is_layer: 0,
                owner_id,
                q: params.q,
                section: "search",
                retOnlyBody: true
            }).catch(reject);
            res = res.replace("<!--", "");
            try {
                const { payload } = JSON.parse(res);
                let html = payload[1][2];
                let audios = this.getAudiosFromHTML(html, /data-audio=\"(.*?)\" onmouse/);
                audios = audios.filter(a => a[1] === owner_id);

                if(!audios.length) {
                    html = payload[1][0];
                    audios = this.getAudiosFromHTML(html, /data-audio=\"(.*?)\" onmouse/);
                    audios = audios.filter(a => a[1] === owner_id);
                } 

                return resolve({ 
                    _q: params.q, 
                    list: await this.getNormalAudios(audios) 
                });

            } catch(e) { 
                return resolve({
                    _q: params.q, 
                    list: [] 
                }); 
            }
        });
    }
}

module.exports = AudioAPI;