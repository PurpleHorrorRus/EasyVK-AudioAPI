const HTMLParser = require("node-html-parser");

const AudioRequests = require("./audio");
const ArtistsStatic = require("../static/artists");
const PlaylistsStatic = require("../static/playlists");
class Artists extends ArtistsStatic {
    constructor (client, vk) {
        super(client, vk);
        this.audio = new AudioRequests(client, vk);
        this.PlaylistsStatic = new PlaylistsStatic(client, vk);

        this.classes = {
            ...this.classes,

            ARTIST: {
                BLOCK: ".MusicAuthor_block",
                TITLE: ".MusicAuthor_block__title",
                COVER: ".MusicAuthor_block__cover"
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

        return {
            name: block.querySelector(this.classes.ARTIST.TITLE).text,
            cover: this.getCover(block, this.classes.ARTIST.COVER),
            artists: this.builder(data),
            collections: this.PlaylistsStatic.buildCollections(data),
            ...(params.list ? { audios: await this.audio.builder(data, params) } : {})
        };
    }

    async getByBlock (params = {}) {
        return await this.getDataByBlock(this, params);
    }

    async withMore (more, params = {}) {
        return await this.getDataWithMore(this, more, params);
    }

    async collections (link) {
        if (!link) {
            console.error("Incorrect link to collection");
            return;
        }

        const data = await this.request({}, true, false, link);
        const root = HTMLParser.parse(data);
        const blocks = root.querySelectorAll(this.classes.COLLECTIONS.NOT_SEPARATOR);

        return blocks
            .map(object => this.PlaylistsStatic.buildCollectionPage(object))
            .filter(c => c !== null);
    }

    async similar (artist) {
        artist = artist.toLowerCase();
        const data = await this.request({}, true, false, `/artist/${artist}/related`);
        return this.builder(data);
    }
}

module.exports = Artists;