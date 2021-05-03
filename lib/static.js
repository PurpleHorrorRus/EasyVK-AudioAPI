const HTMLParser = require("node-html-parser");
const { JSDOM } = require("jsdom");
class Static {
    constructor (client, vk) {
        this.client = client;
        this.vk = vk;
        this.user = vk.user;
        this.uploader = vk.upload;

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
            AUDIO_ITEM_INDEX_RESTRICTION: 21,
            AUDIO_ITEM_INDEX_CHART: 25,

            AUDIO_ITEM_CAN_ADD_BIT: 2,
            AUDIO_ITEM_CLAIMED_BIT: 4,
            AUDIO_ITEM_HQ_BIT: 16,
            AUDIO_ITEM_LONG_PERFORMER_BIT: 32,
            AUDIO_ITEM_UMA_BIT: 128,
            AUDIO_ITEM_REPLACEABLE: 512,
            AUDIO_ITEM_EXPLICIT_BIT: 1024
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

        this.classes = {
            BLOCK: ".CatalogBlock",
            AUDIO: {
                ROW: ".audio_row",
                ITEM: ".audio_item",
                ATTRIBUTE: "data-audio"
            },
            PLAYLIST: { 
                ITEM: {
                    BLOCK: "._audio_pl_item",
                    TITLE: ".audio_item__title",
                    COVER: ".audio_pl__cover",
                    ARTISTS: ".audio_pl_snippet__artist_link"
                }, 
                
                TITLE: ".audio_pl__title",

                COUNT: ".audio_pl__stats_count",
                LISTENS: ".audio_pl__stats_listens",
                YEAR: ".audio_pl__year_subtitle",
                COLLECTIONS: {
                    PAGE: "._audio_page__playlists",
                    TITLE: ".CatalogBlock__title",
                    LINK: ".audio_page_block__show_all_link"
                }
            }
        };

        String.prototype.replaceAll = function (search, replace) { 
            return this.split(search).join(replace); 
        };
    }

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
                } 
                
                return e;
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
            if (!e || e.length % 4 === 1) {
                return !1;
            }

            for (var t, i, o = 0, r = 0, a = ""; true;) {
                i = e.charAt(r++);
                if (!i) break;

                i = n.indexOf(i);
                i = ~i && (t = o % 4 ? 64 * t + i : i, o++ % 4) && (a += String.fromCharCode(255 & t >> (-2 * o & 6)));
            }

            return a;
        };

        return (() => {
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

                if (t && t.substr(0, 4) === "http") {
                    return t;
                }
            } 

            return e;
        })();
    }

    async request (params, post = true, isMobile = false, file = "al_audio.php") {
        return await this.client.requestEndpoint(params, post, isMobile, file);
    }

    async getDataByBlock (context, params, field) {
        if (!params.block && !params.type) {
            throw new Error("You must to specify block or type");
        }

        const response = await this.request({
            ...params,
            section: params.section || "recoms"
        });

        if (params.page) {
            return response;
        }

        if (!context.builder) {
            throw new Error("Builder function required");
        }

        let list = context.builder(response);
        let more = this.parseMore(response);

        if (params.all) {
            params.raw = true;

            while (more !== null) {
                const data = await this.getDataWithMore(context, more, field);
                list = [...list, ...data.list];
                more = data.more;
            }
        }

        return { list, more };
    }

    async getDataWithMore (context, more, field) {
        if (!context.builder) {
            throw new Error("Builder function required");
        }

        if (!more || !more.section_id || !more.start_from) {
            throw new Error("Pass a valid \"more\" object");
        }

        const response = await this.request({
            act: "load_catalog_section",
            al: 1,
            section_id: more.section_id,
            start_from: more.start_from
        });

        let list = [];
        if (typeof response === "object") {
            list = !field
                ? context.builder(response.payload[1][0])
                : response.payload[1][1][field].map(item => context.builder(item));
        } else {
            list = context.builder(response);
        }

        return {
            list,
            more: typeof response === "object" ? this.parseMore(response.payload[1][1]) : this.parseMore(response)
        };
    }

    chunkify (arr, size) {
        return arr.reduce((acc, e, i) => (i % size 
            ? acc[acc.length - 1].push(e) 
            : acc.push([e]), acc), []
        );
    }

    unescape (text) {
        return new JSDOM(`<!DOCTYPE html><p>${text}</p>`).window.document.querySelector("p").textContent;
    }

    getCover (item, className) {
        try {
            return item.querySelector(className).attributes.style
                .match(/background-image:\s?url\('?(.*?)'?\)/)[1];
        } catch (e) {
            return null;
        }
    }

    parseMore (response) {
        if (typeof response === "string") {
            if (/data-id='(.*?)' data-next='(.*?)'/.test(response)) {
                const [, section_id, start_from] = response.match(/data-id='(.*?)' data-next='(.*?)'/);
                return { section_id, start_from };
            }
        } else if (typeof response === "object") {
            const section_id = response.section_id || response.sectionId || "",
                start_from = response.next_from || response.nextFrom || response.nextOffset || "";

            if (start_from) {
                return { 
                    section_id, 
                    start_from,
                    next_from: start_from
                };
            }
        }

        return null;
    }

    async mainPage () {
        if (this.mainPageCache) {
            return this.mainPageCache;
        } else {
            this.mainPageCache = await this.request();
            setTimeout(() => this.mainPageCache = null, 60 * 1000 * 60);

            return this.mainPageCache;
        }
    }
}

module.exports = Static;