const HTMLParser = require("node-html-parser");

const AudioRequests = require("./audio");
const PlaylistsStatic = require("../static/playlists");

class Artists extends PlaylistsStatic {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
        this.audio = new AudioRequests(client, vk, params);
    }

    async get (params = {}) {
        if (!params.artist) {
            console.error("Null artist is not acceptable");
            return;
        }

        params.artist = params.artist.toLowerCase();

        const { html } = await this.request({}, true, true, `/artist/${params.artist}`);

        try {
            const root = HTMLParser.parse(html);

            const name = root.querySelector(".MusicAuthorCover__title").text;

            const cover = root.querySelector(".MusicAuthorCover__image")
                .attributes.style
                .match(/background-image: url\('(.*?)'\)/)[1];

            const data_audios = root.querySelectorAll(".audio_item")
                .map(a => JSON.parse(a.attributes["data-audio"]));
                    
            const audios = params.raw 
                ? this.audio.getRawAudios(data_audios)
                : await this.audio.parse(data_audios, params);
    
            const pl_objects = root.querySelectorAll(".audioPlaylists__item");
            const playlists = pl_objects.map(object => this.buildPlaylistsMobile(object));
                
            return {
                name,
                cover,
                audios,
                playlists
            };
        } catch (e) {
            throw new Error("Can't fetch artist due internal VK error");
        }
    }
}

module.exports = Artists;