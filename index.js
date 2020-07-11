const HTMLParser = require("node-html-parser");
class AudioAPI {
    constructor (client) {
        this.client = client;
        this.vk = client._vk;
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

        this.parserConfig = {
            audio_regex: RegExp("data-audio=\"(.*?)\">n", "gm"),
            clearMatch: match => {
                return match
                    .replaceAll("&quot;", "\"")
                    .replaceAll("\\\"", "")
                    .replace("\\recom\\", "recom")
                    .replace("\\hash\\:\\", "hash:")
                    .replace("\\}}", "}}")
                    .replaceAll("\\", "");
            }
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
            if (n) {
                let o = n;
                for (t = Math.abs(t); true;) {
                    o -= 1;
                    if (o < 0) break;
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
                if (n) {
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
            if (!o() && ~e.indexOf("audio_api_unavailable")) {
                const splitted = e.split("?extra=")[1];
                let t = splitted ? splitted.split("#") : e.split("?extra")[0];
                const alter = splitted ? t[1] : t[0];

                let n = !alter.length ? "" : a(alter);
                t = a(t[0]);
                if (typeof n !== "string" || !t) return e;
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

        const m = e => {
            /*
                Какие-то аудио встречаются с такими ссылками:
                https://psv4.vkuseraudio.net/c813138/u325365941/ac39dd373b8/audios/fc21ebcd3bd2/index.m3u8
                Меняем её на
                https://psv4.vkuseraudio.net/c813138/u325365941/audios/fc21ebcd3bd2.mp3
            */

            /*
                А иногда с такими (я предполагаю, что это ссылки на оооочень давно загруженные аудиозаписи, хотя могу ошибаться):
                https://cs4-5v4.vkuseraudio.net/p9/ace9644a9a3/b5b6f7c2685638/index.m3u8
                Меняем её на
                https://cs4-5v4.vkuseraudio.net/p9/b5b6f7c2685638.mp3
            */

            e = e.replace("https://", "");
            const splitted = e.split("/");

            const isNew = /psv(.*?vkuseraudio.net)/.test(e);

            const filename = splitted[isNew ? 5 : 3];
            const spliced = splitted.splice(0, isNew ? 3 : 2);
            const server = spliced.join("/");

            if (!filename || !server) return null;

            const url = [
                server,                     // SERVER
                isNew ? "audios" : null,    // IF AUDIO STORING ON "NEW" SERVER
                `${filename}.mp3`           // NAME OF FILE
            ].filter(x => x).join("/");

            return `https://${url}`;
        };

        return m(r(e));
    }

    getURL (token) { return this.UnmuskTokenAudio(token); }

    // --------------------- OBJECTS ----------------------

    chunkify (array, chunkSize = 10) {
        if (!array || !array.length) throw new Error("No audios in query");
        const len = array.length;
        let r = [];
        for (let i = 0; i < Math.ceil(len / chunkSize); i++) {
            r = [...r, []];
            for (let j = 0; j < chunkSize; j++) {
                if (array[j]) r[i] = [...r[i], array[j]];
                else break;    
            }
            array.splice(0, chunkSize);
            if (!array.length) break;
        }
        return r;
    }

    getNormalAudios (audios) {
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
                ready = ready.concat(audios_ready);
            } 
            
            return resolve(ready);
        });
    }


    getAudioAsObject (audio = []) {
        const source = this.UnmuskTokenAudio(audio[this.AudioObject.AUDIO_ITEM_INDEX_URL], this.user_id);
    
        const e = (audio[this.AudioObject.AUDIO_ITEM_INDEX_HASHES] || "").split("/"),
            c = (audio[this.AudioObject.AUDIO_ITEM_INDEX_COVER_URL] || ""),
            cl = c.split(",");
    
        const audio_ = {
            id: audio[this.AudioObject.AUDIO_ITEM_INDEX_ID],
            owner_id: audio[this.AudioObject.AUDIO_ITEM_INDEX_OWNER_ID],
            url: source || "",
            title: audio[this.AudioObject.AUDIO_ITEM_INDEX_TITLE],
            performer: audio[this.AudioObject.AUDIO_ITEM_INDEX_PERFORMER],
            duration: audio[this.AudioObject.AUDIO_ITEM_INDEX_DURATION],
            covers: c,
            is_restriction: !source,
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

        if (!actionHash || !otherHash) return null;
    
        adi[2] = actionHash;
        adi[3] = otherHash;
    
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
            explicit: playlist.isExplicit || false,
            followed: playlist.isFollowed,
            official: playlist.isOfficial,
            listens: playlist.listens,
            size: playlist.totalCount,
            follow_hash: playlist.followHash,
            edit_hash: playlist.editHash,
            covers,
            description: playlist.description,
            raw_description: playlist.rawDescription,
            context: playlist.context || playlist.type || "",
            access_hash: playlist.accessHash,
            playlist_id: playlist.id
        };
    }

    // --------------------- AUDIOS ----------------------

    get (params = {}) {

        /*
            access_hash?: string
            owner_id: number
            playlist_id: number
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
            if (params.getCount) return resolve(count);
            
            const max = params.count || 50;
            let { list } = payload;
            if (!list) return reject(new Error("Access denied"));

            list = list.length > max ? list.splice(0, max) : list;
            const audios = await this.getNormalAudios(list);

            return resolve({ audios, count });
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
            count?: number = 50
            offset?: number = 0
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
            if (!payload) return reject(new Error("getPlaylistById error"));
            const playlist = this.getPlaylistInfo(payload);
            if (params.list) {
                if (!payload.list) return reject(new Error("getPlaylistById fetching list error"));
                if (playlist.official) params.count = params.list.length;
                const count = params.count || 50;
                const offset = params.offset || 0;
                const needSplice = offset > 0 || payload.list.length > count;
                const list = needSplice ? payload.list.splice(offset, count) : payload.list;
                playlist.list = await this.getNormalAudios(list);
            } return resolve(playlist);
        });
    }

    getPlaylists (params = {}) {

        /*
            access_hash?: string
            owner_id: number
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

    getPlaylistsCount (params = {}) {

        /*
            access_hash?: string
            owner_id: number
        */

        return new Promise(async (resolve, reject) => {
            params.getCount = true;
            const count = await this.getPlaylists(params).catch(reject);
            return resolve(count);
        });
    }

    getSongsByBlock (params = {}) {

        /*
            block: string
        */

        return new Promise(async (resolve, reject) => {
            if (!params.block) return reject(new Error("You must to specify type"));

            const res = await this.request({
                block: params.block,
                section: "recoms"
            }).catch(reject);
            const list = this.getAudiosFromHTML(res);
            const audios = await this.getNormalAudios(list);
            return resolve(audios);
        });
    }

    getPlaylistsByBlock (params = {}) {

        /*
            block: string
        */

        return new Promise(async (resolve, reject) => {
            String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };

            if (!params.block) return reject(new Error("You must to specify type"));

            const res = await this.request({
                block: params.block,
                section: "recoms"
            }).catch(reject);

            let playlists = [];

            const root = HTMLParser.parse(res);
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
                if (access_hash.length) access_hash = access_hash.replaceAll("'", "");

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

    getFriendsUpdates () {
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
            let list = [];
            const { playlists } = res.payload[1][1];
            const map = playlists.map(e => e.list).filter(e => e.length);
            map.forEach(e => e.length ? list = list.concat(e) : list = [...list, e]);
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

    uploadAudio (path = "") {
        return new Promise(async (resolve, reject) => {
            if (!path) return reject(new Error("You must to specify path in params"));

            const { upload_url: url } = await this.vk.call("audio.getUploadServer").catch(reject);
            const data = await this.uploader.uploadFile(url, path, "file", {}).catch(reject);
            const saved = await this.vk.post("audio.save", data).catch(reject);

            return resolve(saved);
        });
    }

    uploadCover (path = "") {
        return new Promise(async (resolve, reject) => {
            const url = await this.getPlaylistCoverUploadURL().catch(reject);
            const file = await this.uploader.uploadFile(url, path, "photo", {}).catch(reject);
            const string = JSON.stringify(file);
            return resolve(string);
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

            const playlist = this.getPlaylistInfo(res.payload[1][0]);
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
        try {
            const info = playlist.childNodes[1];
            const raw = info.rawAttrs;
        
            const bod = HTMLParser.parse(playlist.innerHTML);
            const title_object = bod.querySelector(".audio_pl__title");
            const title = title_object.text.replaceAll("\n", "").trim();
        
            const cover = raw.match(/background-image: url\(\'(.*?)\'\)/)[1];
            const match = raw.match(/showAudioPlaylist\((.*?)\)/)[1];
            const split = match.split(", ");
            const owner_id = split[0], 
                playlist_id = split[1], 
                access_hash = split[2] == "''" ? "" : split[2].replaceAll("'", "");
        
            return { access_hash, owner_id, playlist_id, cover, title, raw_id: `${owner_id}_${playlist_id}` };
        } catch (e) { return null; }
    }

    getGenreByHTML (html) {
        const root = HTMLParser.parse(html);
        const inner = root.querySelectorAll(".CatalogBlock");
        let pl_objects = [];
        let genre = "";
        let block = "";
        const genres = {};
        for (const inner_object of inner) {
            try { 
                const inner_parsed = HTMLParser.parse(inner_object.innerHTML);
                try {
                    genre = inner_parsed.querySelectorAll(".CatalogBlock__title")[0].text;
                    block = inner_parsed.innerHTML.match(/&block=(.*?)\"/)[1];
                } catch (e) { continue; }
                pl_objects = inner_parsed.querySelectorAll(".audio_pl_item2");
                for (const object of pl_objects) {
                    const dom = HTMLParser.parse(object.innerHTML);
                    if (dom.childNodes[1] === null) continue;
                    const playlist = this.getPlaylistByHTML(dom);
                    if (playlist === null) continue;
                    if (!genres[genre]) genres[genre] = { block, playlists: [] };
                    genres[genre].playlists = [...genres[genre].playlists, playlist];
                }
            } catch(e) { return []; }
        }
        return genres;
    }

    loadRecoms (code = "") {

        /*
            code: string
        */

        const uid = this.user_id;
    
        return new Promise(async (resolve, reject) => {
            const res = await this.request({
                section: "recoms_block",
                type: code,
                retOnlyBody: true
            }, true, false, `/audios${uid}`).catch(reject);
            
            const matches = this.getAudiosFromHTML(res);
            return resolve(matches);
        });
    }

    loadNewReleases (params = {}) {

        /*
            max?: number = 50
            r_max?: number = 50
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
            }).catch(reject);

            const catalogs = _add.payload[1][0];
            for (const _c of catalogs) {
                const build = this.getGenreByHTML(_c);
                many_playlists = Object.assign(many_playlists, build);
            }

            const { playlist: charts_playlist } = payload;

            const max = params.max || 50;
            const r_max = params.r_max || 50;

            const _c_audios = charts_playlist.list.length > max ? charts_playlist.list.splice(0, max) : charts_playlist.list;
            const resolved_c_audios = await this.getNormalAudios(_c_audios).catch(reject); 

            const charts = {
                id: charts_playlist.id,
                audios: resolved_c_audios
            };

            const dom = res.payload[1][0];
            const types_regex = RegExp("&type=(.*?)\"", "gm");
            const types = Array.from(dom.matchAll(types_regex)).map(t => t[1]);

            const recoms_code = types[0];
            const _r = await this.loadRecoms(recoms_code, { count: r_max }).catch(reject);
            const _r_audios = _r.length > r_max ? _r.splice(0, r_max) : _r;
            const resolved_r_audios = await this.getNormalAudios(_r_audios).catch(reject);
        
            const recoms = {
                id: recoms_code,
                audios: resolved_r_audios
            };
        
            const _n = this.getAudiosFromHTML(dom);
            const _n_audios = _n.length > max ? _n.splice(0, max) : _n;
            const resolved_n_audios = await this.getNormalAudios(_n_audios).catch(reject);

            const _new = { audios: resolved_n_audios };

            return resolve({ 
                recoms, 
                new: _new, 
                charts, 
                many_playlists 
            });
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

    getAudiosFromHTML (html, regex = RegExp("data-audio=\"(.*?)\"", "gm")) {
        String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };

        const matches = html.matchAll(regex) || html.matchAll(this.parserConfig.audio_regex);

        const audios = Array.from(matches, ([, match]) => {
            try { return JSON.parse(match); } 
            catch (exception) {
                try {
                    match = this.parserConfig.clearMatch(match);
                    return JSON.parse(match);
                } catch (e1) { throw new Error(`to validate: ${match}`); }
            }
        });

        return audios;
    }

    // --------------------- ARTISTS ----------------------------------------

    getArtist (artist) {
        String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };
        return new Promise(async (resolve, reject) => {
            if (!artist) return reject(new Error("Null artist is not acceptable"));
            artist = artist.toLowerCase();
            let { html } = await this.request({}, true, true, `/artist/${artist}`);
            if (!html) return reject(new Error("This artist's page is broken due to VK"));
            html = html.replaceAll("\\", "").replaceAll("& quot;", "\"").replaceAll("&quot;", "\"").replaceAll("&#39;", "\"");

            try {
                let artist_name = null;
                try { artist_name = html.match(/title\":\"(.*?)\",\"/)[1]; }
                catch(e) { artist_name = html.match(/header__text\">(.*?)</)[1]; } 
    
                const matches = this.getAudiosFromHTML(html, RegExp("data-audio=\"(.*?)\">", "gm"));
                const audios = await this.getNormalAudios(matches);
                const playlists = this.buildPlaylistsMobile(html);
      
                let cover_url = "";
                try { cover_url = html.match(/background-image: url\(\"(.*?)\"\)/)[1]; } catch(e) { console.log(e); }
                return resolve({ artist_name, link: artist, cover_url, audios, playlists });
            } catch(e) { return reject(new Error("Can't open the artist")); }
        });
    }

    // --------------------- BUILD OBJECTS FROM SEARCH ----------------------
    
    buildPlaylists (html) {
        String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };
        
        let playlists = [];

        const title_template = /\(this\)\)">(.*?)</;
        const cover_template = /background-image: url\(\'(.*?)\'/;
        const info_template = /showAudioPlaylist\((.*?)\)/;
        const subtitle_template = /(.*?)<(.*)>(.*)/; // ... ?

        const root = HTMLParser.parse(html);
        const blocks = root.querySelectorAll("._audio_pl_item");

        for (const block of blocks) {
            try {
                const inner = block.innerHTML;

                const title = title_template.test(inner) ? inner.match(title_template)[1] : "";
                if (!title) continue;

                const cover = cover_template.test(inner) ? inner.match(cover_template)[1] : "";
                const info  = info_template.test(inner) ? inner.match(info_template)[1].split(", ") : [];
                if (!info.length) continue;
    
                const owner_id = info[0],
                    playlist_id = info[1],
                    access_hash = info[2].replaceAll("'", "");

                const raw_id = `${owner_id}_${playlist_id}`;

                const root_block = HTMLParser.parse(inner);
                const subtitle_block = root_block.querySelector(".audio_pl__year_subtitle");
                const subtitle_inner = subtitle_block.innerHTML;
                const subtitle_test  = subtitle_template.test(subtitle_inner);
                
                let year = "";
                let subtitle = "";
                
                if (subtitle_test) {
                    const match = subtitle_inner.match(subtitle_template);
                    year = match[1];
                    subtitle = match[3];
                }

                playlists = [...playlists, { 
                    access_hash, 
                    owner_id, 
                    playlist_id, 
                    raw_id, 
                    title, 
                    cover_url: cover, 
                    year, 
                    subtitle 
                }];

            } catch (e) { continue; }
        }

        return playlists;
    }

    buildPlaylistsMobile (res) {
        const html = res.replaceAll("\\", "");
        const root = HTMLParser.parse(html);
        let pl_objects = root.querySelectorAll(".audioPlaylists__item");
        if (!pl_objects.length) pl_objects = root.querySelectorAll(".audioPlaylists__itemLink");
        if (!pl_objects.length) return;
        
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
    
                return { 
                    access_hash, 
                    owner_id, 
                    playlist_id, 
                    raw_id, 
                    cover_url, 
                    title, 
                    subtitle, 
                    year 
                };
            } catch(e) { return { error: true }; }
        };

        let playlists = [];
        for(const playlist of pl_objects) {
            const builded = getPlaylist(playlist);
            if (!builded.error) playlists = [...playlists, builded];
        }

        return playlists;
    }

    buildArtists (html) {
        String.prototype.replaceAll = function(search, replace) { return this.split(search).join(replace); };

        let artists = [];

        const cover_template = /background-image: url\((.*?)\)/;
        const link_template = /href=\"\/artist\/(.*?)\?/;

        const root = HTMLParser.parse(html);
        const blocks = root.querySelectorAll(".audio_block_small_item");

        for (const block of blocks) {
            try {
                const title = block.structuredText;
                const inner = block.innerHTML;
                const cover = cover_template.test(inner) ? inner.match(cover_template)[1] : "";
                const link = inner.match(link_template)[1];
                artists = [...artists, { title, cover, link }];
            } catch (e) { continue; }
        }

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

        /*
            q: string
        */

        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            if (!params.q) return reject(new Error("You must to specify search value"));

            const res = await this.request({
                act: "section",
                al: 1,
                claim: 0,
                is_layer: 0,
                owner_id: uid,
                q: params.q,
                section: "search"
            });

            const html = res.payload[1][0];
            const payload = res.payload[1][1];
            const section_id = payload.sectionId;
            const start_from = payload.next_from || payload.nextFrom;

            const list = payload.playlist.list || payload.playlistData.list || [];
            let audios = [];

            if (list && list.length)
                audios = await this.getNormalAudios(list);
            
            const artists = this.buildArtists(html);
            const playlists = this.buildPlaylists(html);

            const more = { section_id, start_from };

            return resolve({ audios, playlists, artists, more });
        });
    }

    searchWithMore (params = {}) {
        
        /*
            search: object (from search())
        */

        return new Promise(async (resolve, reject) => {
            if (!params.search) return reject(new Error("Pass a valid \"search\" object"));
            
            const more = params.search.more;
            if (!more.section_id || !more.start_from) return reject(new Error("Pass a valid \"search\" object"));

            const res = await this.request({
                act: "load_catalog_section",
                al: 1,
                section_id: more.section_id,
                start_from: more.start_from
            });

            const payload = res.payload[1][1];

            const section_id = payload.sectionId;
            const start_from = payload.next_from || payload.nextFrom;

            const list = payload.playlist.list || payload.playlists[0].list;
            const audios = await this.getNormalAudios(list);
            
            const _more = { section_id, start_from };

            return resolve({ audios, more: _more });
        });

    }

    searchMore (url, params = {}) {
        const { url: form_url, offset, cursor } = params;
        if (!url || !url.length) url = form_url;
        return new Promise(async (resolve, reject) => {
            url = url.toLowerCase();
            const { data } = await this.request({
                url: form_url,
                _ajax: 1,
                offset, 
                next_from: cursor
            }, true, true, url);

            if (!data[0]) return reject(new Error("searchMore error"));
            const objects = data[0];
            const values = Object.values(objects);
            const map = values.map(v => v[1]);
            const audios = await this.getNormalAudios(map);
            return resolve({
                list: audios,
                next: data[2] || null
            });
        });
    }

    async searchMorePlaylists (url, params = {}) {
        const { url: form_url, offset, cursor } = params;
        if (!url || !url.length) url = form_url;
        return new Promise(async resolve => {
            url = url.toLowerCase();
            const { data, next }  = await this.request({
                url: form_url,
                _ajax: 1,
                offset, 
                next_from: cursor
            }, true, true, url);

            const buildPlaylist = (raw_id, object) => {
                const title = object[0];
                const html = object[1];

                const split = raw_id.split("_");
                const owner_id = Number(split[0]);
                const playlist_id = Number(split[1]);

                const access_hash = html.match(/access_hash=(.*?)\"/)[1].trim();
                const cover_url   = html.match(/background-image: url\(\'(.*?)\'/)[1].trim();

                let subtitle = "", year = "";
                try {
                    const subtitle_match = html.match(/__stats\">(.*?)<(.*?)<\/span>(.*?)</);
                    subtitle             = subtitle_match[1].trim(),
                    year                 = subtitle_match[3].trim() != "n" ? subtitle_match[3].trim() : "";
                } catch(e) { console.log(e); }

                return {
                    access_hash,
                    title,
                    cover_url,
                    owner_id,
                    playlist_id,
                    raw_id,
                    subtitle,
                    year
                };
            };
          
            const pl_objects = data[0];
            const raw_ids = data[1];

            let playlists = [];
            for (const raw_id of raw_ids) {
                const object = pl_objects[raw_id];
                try {
                    const playlist = buildPlaylist(raw_id, object); 
                    playlists = [...playlists, playlist];
                } catch (e) {
                    console.error("Can't parse playlist", object);
                    continue;
                }
            }
            
            return resolve({
                list: playlists,
                next: next || "nothing"
            });
        });
    }

    async searchHints (q = "") {
        if (!q) return;
        
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

        /*
            q: string
            owner_id: number
            count?: number
        */

        if (!params.q) return;
        
        return new Promise(async (resolve, reject) => {
            const owner_id = Number(params.owner_id) || this.user_id;
            const res = await this.request({
                act: "section",
                al: 1,
                claim: 0,
                is_layer: 0,
                owner_id,
                q: params.q,
                section: "search"
            }).catch(reject);
            
            const html = res.payload[1][0];
            let matches = this.getAudiosFromHTML(html, RegExp("data-audio=\"(.*?)\" onmouse", "gm"));
            matches = matches.filter(a => Number(a[1]) === owner_id);

            if (params.count) 
                matches = matches.splice(0, params.count);

            const audios = await this.getNormalAudios(matches);
            return resolve({ list: audios, _q: params.q });
        });
    }
}

module.exports = AudioAPI;