const HTMLParser = require("node-html-parser");
const querystring = require("querystring");

const Static = require("../static");

const AudioRequests = require("./audio");
const PlaylistsStatic = require("../static/playlists");
const ArtsistsStatic = require("../static/artists");

class SearchRequests extends Static {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
        this.audio = new AudioRequests(client, vk, params);
        this.PlaylistsStatic = new PlaylistsStatic(client, vk, params);

        this.classes = {
            ...this.classes,
            MORE_PLAYLISTS: ".audioPlaylistsPage__item"
        };
    }

    async query (params = {}) {

        /*
            q: string
        */

        if (!params.q) {
            throw new Error("You must to specify search value");
        }

        const res = await this.request({
            act: "section",
            al: 1,
            claim: 0,
            is_layer: 0,
            owner_id: this.user,
            q: params.q,
            section: "search"
        });

        const html = res.payload[1][0];
        const payload = res.payload[1][1];
        const section_id = payload.sectionId;
        const start_from = payload.next_from || payload.nextFrom;

        let list = [];
        let audios = [];

        if (payload.playlist) {
            list = payload.playlist.list;
        } else if (payload.playlistData) {
            list = payload.playlistData.list;
        }

        if (list && list.length) {
            audios = params.raw 
                ?  this.audio.getRawAudios(list)
                : await this.audio.parse(list, params);
        }
    
        const artists = ArtsistsStatic.build(html);
        const playlists = this.PlaylistsStatic.build(html);

        const more = { section_id, start_from };

        return { 
            audios, 
            playlists, 
            artists, 
            more 
        };
    }

    formatURL (url, params = {}) {
        url = url.toLowerCase();

        if (params.start_from) {
            const query = querystring.encode({ start_from: params.start_from });
            url += `?${query}`;
        }

        return url;
    }

    async more (url, params = {}) {
        const { data } = await this.request({ _ajax: 1 }, true, true, this.formatURL(url, params));
        const [, object] = data;

        if (!object) {
            throw new Error("more error");
        }

        const { list } = object.playlist;
        const audios = params.raw
            ? this.audio.getRawAudios(list)
            : await this.audio.parse(list, params);

        return {
            audios,
            start_from: object.next_from
        };
    }

    async morePlaylists (url, params = {}) {
        const classes = {
            link: ".audioPlaylistsPage__itemLink",
            title: ".audioPlaylistsPage__title",
            cover: ".audioPlaylistsPage__cover",
            subtitle: ".audioPlaylistsPage__author",
            stats: ".audioPlaylistsPage__stats"
        };

        const { data } = await this.request({ _ajax: 1 }, true, true, this.formatURL(url, params));

        const raw_objects = !params.start_from 
            ? data[0][0].inner[0][0][0].inner[3].inner // ВК, какого хрена вообще??
            : HTMLParser.parse(data[0][0]).querySelectorAll(this.classes.MORE_PLAYLISTS).map(h => ({ __raw__: h.outerHTML }));
                        
        const playlists = raw_objects
            .map((p, index) => {
                return {
                    ...data[1].playlists[index],
                    ...this.PlaylistsStatic.buildPlaylistsMobile(HTMLParser.parse(p.__raw__), classes)
                };
            });
                
        return {
            playlists,
            start_from: data[1].next_from || null
        };
    }

    async hints (params = {}) {
        if (!params.q) {
            return;
        }
        
        const res = await this.request({
            act: "a_gsearch_hints",
            al: 1,
            q: params.q,
            section: "audio"
        }, true, false, "hints.php");

        try {
            const payload = res.payload[1][0];

            if (!payload) {
                throw new Error("Search hints is broken");
            }

            return payload.map(r => [ r[1], r[3] ]);
        } catch (_e) { 
            return []; 
        }
    }

    async inAudios (params) {

        /*
            q: string
            owner_id: number
            count?: number
        */
        
        if (!params.q) {
            throw new Error("You must to specify query for search");
        }

        const owner_id = Number(params.owner_id) || this.user;
        
        const { payload } = await this.request({
            act: "section",
            al: 1,
            claim: 0,
            is_layer: 0,
            owner_id,
            q: params.q,
            section: "search"
        });

        const html = payload[1][0];
        let matches = this.getAudiosFromHTML(html);
        matches = matches.filter(a => Number(a[1]) === owner_id);

        if (params.count) {
            matches = matches.splice(0, params.count);
        }

        const audios = params.raw 
            ? this.audio.getRawAudios(matches) 
            : await this.audio.parse(matches, params);

        return { 
            list: audios, 
            _q: params.q 
        };
    }

    async getByBlock (params = {}) {

        /*
            block: string
            count?: number - By default, ALL audios are returned
        */

        if (!params.block) {
            throw new Error("You must to specify type");
        }

        const res = await this.request({
            block: params.block,
            section: params.section || "recoms"
        });

        if (params.page) {
            return res;
        }

        let list = this.getAudiosFromHTML(res);

        if (!params.count) {
            params.raw = true;

            if (/data-id='(.*?)' data-next='(.*?)'/.test(res)) {
                let [, section_id, start_from] = res.match(/data-id='(.*?)' data-next='(.*?)'/);
    
                while (section_id.length && start_from.length) {
                    const { audios, more } = await this.audio.withMore({
                        raw: true,
                        normalize: false,
                        more: {
                            section_id,
                            start_from
                        }
                    });
                        
                    list = [...list, ...audios];
                    section_id = more.section_id;
                    start_from = more.start_from;
                }
            }
        } else {
            list = list.splice(0, params.count);
        }

        const audios = params.raw 
            ? this.audio.getRawAudios(list)
            : await this.audio.parse(list, params);
                
        return audios;
    }
}

module.exports = SearchRequests;