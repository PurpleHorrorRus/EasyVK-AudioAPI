const HTMLParser = require("node-html-parser");

const Static = require("../static");
const Promise = require("bluebird");

const AudioRequests = require("./audio");
const PlaylistsStatic = require("../static/playlists");

class Artists extends Static {
    constructor (client) {
        super(client);
        this.audio = new AudioRequests(client);
        this.PlaylistsStatic = new PlaylistsStatic(client);
    }

    get (params = {}) {
        return new Promise(async (resolve, reject) => {
            if (!params.artist) {
                return reject(new Error("Null artist is not acceptable"));
            }

            params.artist = params.artist.toLowerCase();
            const { html } = await this.request({}, true, true, `/artist/${params.artist}`);
            const root = HTMLParser.parse(html);
            
            const name = root.querySelector(".ArtistCover__title")
                .text;

            const cover = root.querySelector(".ArtistCover__image")
                .attributes.style
                .match(/background-image: url\('(.*?)'\)/)[1];

            const data_audios = root.querySelectorAll(".audio_item")
                .map(a => JSON.parse(a.attributes["data-audio"]));
            const audios = await this.audio.getNormalAudios(data_audios);

            const pl_objects = root.querySelectorAll(".audioPlaylists__item");
            const playlists = pl_objects.map(object => this.PlaylistsStatic.buildPlaylistsMobile(object));
            
            return resolve({
                name,
                cover,
                audios,
                playlists
            });
        });
    }
}

module.exports = Artists;