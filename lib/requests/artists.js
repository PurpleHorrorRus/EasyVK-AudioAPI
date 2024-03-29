const HTMLParser = require("node-html-parser");

const AudioRequests = require("./audio");
const ArtistsStatic = require("../static/artists");
const PlaylistsStatic = require("../static/playlists");

class Artists extends ArtistsStatic {
    constructor (client, vk, params) {
        super(client, params);
        this.vk = vk;

        this.audio = new AudioRequests(client, vk, params);
        this.PlaylistsStatic = new PlaylistsStatic(client, vk, params);

        this.classes = {
            ...this.classes,

            ARTIST: {
                BLOCK: ".MusicAuthor_block",
                TITLE: ".MusicAuthor_block__title",
                COVER: ".MusicAuthor_block__cover",
                FOLLOW: ".MusicAuthor__follow_btn"
            },

            COLLECTIONS: {
                NOT_SEPARATOR: ".CatalogBlock:not(.CatalogBlock--separator)"
            }
        };
    }

    async get (artist, params = {}) {
        const data = await this.request({}, true, false, `/artist/${artist.toLowerCase()}`);
        const root = HTMLParser.parse(data);
        const block = root.querySelector(this.classes.ARTIST.BLOCK);

        const followBlock = root.querySelector(this.classes.ARTIST.FOLLOW);
        const followInfo = followBlock.attributes.onclick.match(/AudioUtils\.(.*?)\((.*?)\)/);
        const followMeta = followInfo[2]
            .replaceAll("'", "")
            .replaceAll(" ", "")
            .split(",");

        return {
            name: block.querySelector(this.classes.ARTIST.TITLE).text,

            cover: {
                src: this.getCover(block, this.classes.ARTIST.COVER),
                blur: block.querySelector(this.classes.ARTIST.COVER).classList.contains("blur"),
            },

            artists: this.builder(data),
            collections: this.PlaylistsStatic.buildCollections(data),

            follow: {
                followed: followInfo[1] === "unfollowArtist",
                id: followMeta[0],
                type: followMeta[1],
                hash: followMeta[2]
            },

            ...(params.list ? { audios: await this.audio.builder(data, params) } : {})
        };
    }

    async search (query, params = {}) {
        if (!query) {
            throw new Error("You must to specify query");
        }

        const response = await this.request({
            act: "search_artists",
            al: 1,
            query,
            start_from: params.more?.next_from || ""
        }, true);

        const payload = this.payload(response);

        return {
            artists: payload?.artists || [],
            next: this.getNextFunction(payload.more, () => this.search(query, {
                ...params,
                more: payload.more
            }))
        };
    }

    async getByBlock (params = {}) {
        return await this.getDataByBlock(this, params);
    }

    async withMore (more, params = {}) {
        return await this.getDataWithMore(this, more, params);
    }

    async collections (link) {
        const data = await this.request({}, true, false, link);
        const root = HTMLParser.parse(data);
        const blocks = root.querySelectorAll(this.classes.COLLECTIONS.NOT_SEPARATOR);

        return blocks.map(object => this.PlaylistsStatic.buildCollectionPage(object));
    }

    async related (artist_id, params = {}) {
        if (!artist_id) {
            return [];
        }

        const response = await this.request({
            act: "get_related_artists",
            al: 1,
            artist_id: String(artist_id),
            count: Number(params.count) || 10
        });

        const payload = this.payload(response);
        return payload?.artists || [];
    }

    async similar (artist) {
        artist = artist.toLowerCase();
        const data = await this.request({}, true, false, `/artist/${artist}/related`);
        return this.builder(data);
    }

    async follow (follow) {
        const response = await this.request({
            act: "follow",
            al: 1,
            artist_id: follow.id,
            hash: follow.hash,
            ref: "artist"
        }, true, false, "al_artist.php");

        return response.payload[1][0];
    }

    async unfollow (follow) {
        const response = await this.request({
            act: "unfollow",
            al: 1,
            artist_id: follow.id,
            hash: follow.hash,
            ref: "artist"
        }, true, false, "al_artist.php");

        return response.payload[1][0];
    }
}

module.exports = Artists;