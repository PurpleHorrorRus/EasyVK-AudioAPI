const HTMLParser = require("node-html-parser");

const SearchStatic = require("../static/search");
const AudioRequests = require("./audio");
const PlaylistsStatic = require("../static/playlists");
const ArtsistsStatic = require("../static/artists");

class SearchRequests extends SearchStatic {
    constructor (client, vk, params) {
        super(client, params);
        this.vk = vk;

        this.AudioRequests = new AudioRequests(client, vk, params);
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

        const res = await this.getSection({
            section: "search",
            owner_id: this.vk.user,
            q: String(params.q)
        });

        const html = res.payload[1][0];
        const payload = res.payload[1][1];

        let list = [];
        let audios = [];

        if (payload.playlist) {
            list = payload.playlist.list;
        } else if (payload.playlistData) {
            list = payload.playlistData.list;
        }

        if (list?.length) {
            audios = await this.AudioRequests.parseAudios(list, params);
        }

        const artists = this.ArtsistsStatic.builder(html);
        const playlists = this.PlaylistsStatic.builder(html);

        return {
            audios,
            playlists,
            artists,
            more: this.parseMore(payload)
        };
    }

    async queryExtended (q, params = {}) {
        if (!q) {
            throw new Error("You must to specify search value");
        }

        params.forcePlaylist = true;

        const { payload } = await this.getSection({
            section: "search",
            owner_id: this.vk.user,
            q: String(q)
        });

        const [, [html, data]] = payload;

        const parsed = HTMLParser.parse(html);
        const artistsBlock = parsed.querySelector(this.classes.ARTISTS);

        const parsedPayload = await this.AudioRequests.parsePayload(data, params);

        return {
            artists: {
                list: this.ArtsistsStatic.builder(html),
                ...this.PlaylistsStatic.parseLink(artistsBlock)
            },
            collections: this.PlaylistsStatic.buildCollections(html),
            ...parsedPayload,
            next: this.getNextFunction(parsedPayload.more, () => this.withMore(parsedPayload.more, params))
        };
    }

    async more (url, params = {}) {
        const response = await this.request(params, false, false, url);

        return {

            audios: await this.AudioRequests.builder(response, params),
            more: this.parseMore(response)
        };
    }

    async morePlaylists (url) {
        const response = await this.request({}, true, false, url);
        return {
            playlists: await this.PlaylistsStatic.builder(response),
            more: this.parseMore(response)
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

        const owner_id = Number(params.owner_id) || this.vk.user;

        const response = await this.getSection({
            owner_id,
            section: "search",
            q: params.q
        });

        const matches = await this.AudioRequests.builder(response.payload[1][0], params);
        return {
            list: matches.filter(a => a.owner_id === owner_id),
            q: params.q
        };
    }

    async getByBlock (params = {}) {
        return await this.getDataByBlock(this.AudioRequests, params);
    }

    async withMore (more, params = {}) {
        const response = await this.getDataWithMore(this.AudioRequests, more, params);

        return {
            ...response,
            next: this.getNextFunction(response.more, () => this.withMore(response.more, params))
        };
    }
}

module.exports = SearchRequests;