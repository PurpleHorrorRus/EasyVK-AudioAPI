const path = require("path");
const fs = require("fs-extra");
const Promise = require("bluebird");
const HTMLParser = require("node-html-parser");

const { FormData } = require("formdata-node");
const { fileFromPathSync } = require("formdata-node/file-from-path");

const { JSDOM } = require("jsdom");
const { machineIdSync } = require("node-machine-id");

const n = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0PQRSTUVWXYZO123456789+/=";
const unavailableRegex = /audio_api_unavailable/;

class Static {
    constructor (client, params) {
        this.client = client;
        this.params = params;

        this.uuid = machineIdSync({ original: true });

        this.VKAndroidAppUA = "VKAndroidApp/7.7-10445 (Android 11; SDK 30; arm64-v8a; Xiaomi M2003J15SC; ru; 2340x1080)";

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
                SUBTITLE: ".audio_pl__subtitle",
                COLLECTIONS: {
                    PAGE: "._audio_page__playlists",
                    TITLE: ".CatalogBlock__title",
                    LINK: ".audio_page_block__show_all_link"
                }
            }
        };
    }

    ExposeSource (e) {
        const s = (e, t) => {
            const i = [];

            if (e.length > 0) {
                t = Math.abs(t);

                for (let o = e.length; o-- > 0;) {
                    t = ((e.length * o + e.length) ^ t + o) % e.length;
                    i[o] = t;
                }
            }

            return i;
        };

        const i = {
            v: e => {
                return e.split("").reverse().join("");
            },

            r: (e, t) => {
                e = e.split("");

                for (let i, o = n + n, r = e.length; r; r--) {
                    i = ~i && (e[r] = o.substring(i - t, 1));
                }

                return e.join("");
            },

            s: (e, t) => {
                if (e.length > 0) {
                    const i = s(e, t);
                    let o = 0;
                    for (e = e.split(""); ++o < e.length;) e[o] = e.splice(i[e.length - 1 - o], 1, e[o])[0];
                    e = e.join("");
                }

                return e;
            },

            i: (e, t) => {
                return i.s(e, t ^ this.vk.user);
            },

            x: (e, t) => {
                return e.split("").map((_, i) => {
                    return String.fromCharCode(i.charCodeAt(0) ^ t.charCodeAt(0));
                });
            }
        };

        const a = e => {
            if (!e || e.length % 4 === 1) {
                return false;
            }

            let a = "";
            for (let t, i, o = 0, r = 0; (i = e.charAt(r++));) {
                i = n.indexOf(i);
                i = ~i && (t = o % 4 ? 64 * t + i : i, o++ % 4) && (a += String.fromCharCode(255 & t >> (-2 * o & 6)));
            }

            return a;
        };

        return (() => {
            if (unavailableRegex.test(e)) {
                const [, splitted] = e.split("?extra=");
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

                if (t?.substr(0, 4) === "http") {
                    return t;
                }
            }

            return e;
        })();
    }

    async request (params, post = true, isMobile = false, file = "al_audio.php") {
        return await this.client.requestEndpoint(params, post, isMobile, file);
    }

    async uploadToServer (url, file, field = "file") {
        file = path.resolve(file);

        if (!fs.existsSync(file)) {
            throw new Error(`File not found at path ${file}`);
        }

        const formData = new FormData();
        formData.set(field, fileFromPathSync(file));

        const response = await this.vk.upload.upload(url, {
            formData,
            timeout: 0,
            forceBuffer: true
        });

        return JSON.stringify(response);
    }

    async getDataByBlock (context, params) {
        if (!params.block && !params.type && !params.audio_id) {
            throw new Error("You must to specify block, type or audio_id");
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

        let list = await context.builder(response, params);
        let more = this.parseMore(response);

        if (params.count) {
            list = list.slice(0, params.count);
        } else if (params.all) {
            params.raw = true;

            while (this.validateMore(more)) {
                const data = await this.getDataWithMore(context, more, params);
                list = list.concat(data.list);
                more = data.more;
            }
        }

        return { list, more };
    }

    async loadCatalogSection (more) {
        return await this.request({
            act: "load_catalog_section",
            al: 1,
            section_id: more.section_id,
            start_from: more.start_from
        });
    }

    async getDataWithMore (context, more, params = {}) {
        if (!this.validateMore(more)) {
            throw new Error("Pass a valid \"more\" object");
        }

        const response = await this.loadCatalogSection(more);

        if (params.page) {
            return response;
        }

        if (!context.builder) {
            throw new Error("Builder function required");
        }

        if (response.payload[1].length === 0) {
            await Promise.delay(500);
            return await this.getDataWithMore(...arguments);
        }

        let list = await context.builder(response, params);

        if (params.count) {
            list = list.slice(0, params.count);
        }

        return {
            list,
            more: typeof response === "object"
                ? this.parseMore(response.payload[1][1])
                : this.parseMore(response)
        };
    }

    getNextFunction(more, context, builder, params = {}, ...args) {
        if (!more) {
            return false;
        }

        if (args.length > 0) {
            return async () => context[builder](...args, { ...params, more });
        }

        return async () => context[builder]({ ...params, more });
    }

    unescape (text) {
        return text
            ? JSDOM.fragment(`<p>${text}</p>`).querySelector("p").textContent
            : text;
    }

    getCover (item, className = "") {
        if (className) {
            return item?.querySelector(className)?.attributes.style
                .match(/background-image:\s?url\('?(.*?)'?\)/)[1]
                ?.replace("&amp;", "&") || "";
        }

        return item?.querySelector("img")?.attrs.src || "";
    }

    parseMore (response) {
        switch (typeof response) {
            case "string": {
                return {
                    start_from: response.match(/next_from":"(.*?)"/)[1],
                    section_id: response.match(/sectionId":"(.*?)"/)[1]
                };
            }

            case "object": {
                const start_from = response.next_from
                    || response.nextFrom
                    || response.nextOffset
                    || "";

                if (!start_from) {
                    return null;
                }

                return {
                    section_id: response.section_id || response.sectionId || "",
                    start_from,
                    next_from: start_from
                };
            }

            default: {
                return null;
            }
        }
    }

    validateMore(more) {
        return more?.section_id
            && (more?.start_from || more?.next_from);
    }

    parseFollow(html) {
        if (!html) {
            return null;
        }

        const root = HTMLParser.parse(html);
        const followBlock = root.querySelector(".MusicOwnerCell__actions > .FlatButton");
        if (!followBlock) {
            return {
                followed: false,
                id: 0,
                hash: ""
            };
        }

        const followInfo = followBlock.attributes.onclick.match(/AudioUtils\.(.*?)\((.*?)\)/);
        const followMeta = followInfo[2]
            .replaceAll("'", "")
            .replaceAll(" ", "")
            .split(",");

        return {
            followed: followInfo[1] === "unfollowOwner",
            id: Number(followMeta[0]),
            hash: followMeta[1]
        };
    }

    async mainPage () {
        if (this.mainPageCache) {
            return this.mainPageCache;
        }

        this.mainPageCache = await this.request();
        setTimeout(() => this.mainPageCache = null, 60 * 1000 * 60);
        return this.mainPageCache;
    }

    async getSection (params = {}) {

        /*
            section: String
        */

        if (!params.section) {
            throw new Error("You must to specify section");
        }

        if (!params.owner_id) {
            throw new Error("You must to specify owner_id");
        }

        return await this.request({
            ...params,
            act: "section",
            al: 1,
            claim: 0,
            is_layer: 0,
            owner_id: Number(params.owner_id),
            section: params.section
        });
    }
}

module.exports = Static;