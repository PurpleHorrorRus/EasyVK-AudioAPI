const HTMLParser = require("node-html-parser");

const AudioRequests = require("./audio");
const ArtistsStatic = require("../static/artists");
const PlaylistsStatic = require("../static/playlists");
class Artists extends PlaylistsStatic {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
        this.audio = new AudioRequests(client, vk, params);

        this.classes = {
            ...this.classes,
            ARTIST: {
                TITLE: ".MusicAuthor_block__title",
                COVER: ".MusicAuthor_block__cover"
            },
            COLLECTIONS: { NOT_SEPARATOR: ".CatalogBlock:not(.CatalogBlock--separator)" }
        };
    }

    async get (artist, params = {}) {
        if (!artist) {
            console.error("Null artist is not acceptable");
            return;
        }

        if (params.list === undefined) {
            params.list = true;
        }

        artist = artist.toLowerCase();

        const data = await this.request({}, true, false, `/artist/${artist}`);

        try {
            const root = HTMLParser.parse(data);

            const name = root.querySelector(this.classes.ARTIST.TITLE).text,
                cover = this.getCover(root, this.classes.ARTIST.COVER);

            let audios = [];

            if (params.list) {
                const data = root.querySelectorAll(this.classes.AUDIO.ROW)
                    .map(a => JSON.parse(a.attributes[this.classes.AUDIO.ATTRIBUTE]));
                    
                audios = params.raw 
                    ? this.audio.getRawAudios(data)
                    : await this.audio.parse(data, params);
            }

            const collectionsBlocks = root.querySelectorAll(this.classes.BLOCK);
            const playlistsBlocks = collectionsBlocks.filter(c => c.querySelector(this.classes.PLAYLIST.COLLECTIONS.PAGE));

            return {
                name,
                cover,
                audios,
                artists: ArtistsStatic.build(data),
                collections: playlistsBlocks.map(object => this.buildCollection(object)),
                ...(params.list ? { audios } : {})
            };
        } catch (e) {
            console.error(e);
            throw new Error("Can't fetch artist due internal VK error");
        }
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
            .map(object => this.buildCollectionPage(object))
            .filter(c => c !== null);
    }
}

module.exports = Artists;