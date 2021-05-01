const HTMLParser = require("node-html-parser");

const AudioRequests = require("./audio");
const PlaylistsStatic = require("../static/playlists");

class Artists extends PlaylistsStatic {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
        this.audio = new AudioRequests(client, vk, params);
    }

    async get (artist, params = { list: true }) {
        if (!artist) {
            console.error("Null artist is not acceptable");
            return;
        }

        artist = artist.toLowerCase();

        const { html } = await this.request({}, true, true, `/artist/${artist}`);

        try {
            const root = HTMLParser.parse(html);

            const name = root.querySelector(".MusicAuthorCover__title").text;

            const cover = root.querySelector(".MusicAuthorCover__image")
                .attributes.style
                .match(/background-image: url\('(.*?)'\)/)[1];

            let audios = [];

            if (params.list) {
                const data = root.querySelectorAll(".audio_item")
                    .map(a => JSON.parse(a.attributes["data-audio"]));
                    
                audios = params.raw 
                    ? this.audio.getRawAudios(data)
                    : await this.audio.parse(data, params);
            }
    
            const pl_objects = root.querySelectorAll(".audioPlaylists__item");
            const playlists = pl_objects.map(object => this.buildPlaylistsMobile(object));
                
            return {
                name,
                cover,
                audios,
                playlists,
                ...(params.list ? { audios } : {})
            };
        } catch (e) {
            throw new Error("Can't fetch artist due internal VK error");
        }
    }
}

module.exports = Artists;