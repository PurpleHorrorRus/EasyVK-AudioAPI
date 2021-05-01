const HTMLParser = require("node-html-parser");
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

        this.parserConfig = {
            audio_regex: RegExp("data-audio=\"(.*?)\">n", "gm"),
            clearMatch: match => {
                return match
                    .replaceAll("&quot;", "\"")
                    .replaceAll("\\\"", "")
                    .replace("\\recom\\", "recom")
                    .replace("\\hash\\:\\", "hash:")
                    .replace("\\}}", "}}")
                    .replaceAll("\\", "")
                    .replaceAll("&lt;", "<")
                    .replaceAll("&gt;", ">");
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

    chunkify (arr, size) {
        return arr.reduce((acc, e, i) => (i % size 
            ? acc[acc.length - 1].push(e) 
            : acc.push([e]), acc), []
        );
    }

    unescape (text) {
        try {
            if (!this.parser) {
                // eslint-disable-next-line no-undef
                this.parser = new DOMParser();
            }

            const doc = this.parser.parseFromString(text, "text/html");
            return doc.documentElement.textContent;
        } catch (e) {
            return text;
        }
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

    getAudiosFromHTML (html) {
        const root = HTMLParser.parse(html);

        let a_objects = root.querySelectorAll(".audio_row");

        if (!a_objects.length) {
            a_objects = root.querySelectorAll(".audio_item");
        }

        try {
            return a_objects.map(a => JSON.parse(a.attributes["data-audio"]));
        } catch (e) {
            const audios = a_objects.map(a => {
                const match = a.rawAttrs.match(/data-audio=\"(.*?false])\"/)[1];
                return JSON.parse(match);
            });

            return audios;
        }     
    }
}

module.exports = Static;