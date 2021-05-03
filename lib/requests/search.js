const HTMLParser = require("node-html-parser");
const querystring = require("querystring");

const SearchStatic = require("../static/search");
const AudioRequests = require("./audio");
const PlaylistsStatic = require("../static/playlists");
const ArtsistsStatic = require("../static/artists");

class SearchRequests extends SearchStatic {
    constructor (client, vk, params = {}) {
        super(client, vk, params);

        this.audio = new AudioRequests(client, vk, params);
        this.PlaylistsStatic = new PlaylistsStatic(client, vk, params);
        this.ArtsistsStatic = new ArtsistsStatic(client, vk, params);

        this.classes = {
            ...this.classes,
            MORE_PLAYLISTS: "._audio_pl",
            ARTISTS: ".CatalogBlock__search_global_artists_header"
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
    
        const artists = this.ArtsistsStatic.builder(html);
        const playlists = this.PlaylistsStatic.builder(html);

        const more = { section_id, start_from };

        return { 
            audios, 
            playlists, 
            artists, 
            more 
        };
    }

    async queryExtended (q, params = {}) {
        if (!q) {
            throw new Error("You must to specify search value");
        }

        const { payload }= await this.request({
            act: "section",
            al: 1,
            claim: 0,
            is_layer: 0,
            owner_id: this.user,
            q,
            section: "search"
        }, true, false);

        const [, [html, data]] = payload;

        return {
            artists: {
                ...this.PlaylistsStatic.parseLink(HTMLParser.parse(html).querySelector(this.classes.ARTISTS)),
                list: this.ArtsistsStatic.builder(html)
            },
            collections: this.PlaylistsStatic.buildCollections(html),
            ...await this.audio.parsePayload(data, params)
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

    async morePlaylists (url) {
        const data = await this.request({}, true, false, url);
        return this.PlaylistsStatic.builder(data);
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
        let matches = this.audio.builder(html);
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
        return await this.getDataByBlock(this.audio, params);
    }

    async withMore (more, params = {}) {
        return await this.getDataWithMore(this.audio, more, params);
    }
}

module.exports = SearchRequests;