const HTMLParser = require("node-html-parser");
const Promise = require("bluebird");

const Static = require("../static");
const AudioRequests = require("./audio");
const PlaylistsStatic = require("../static/playlists");

class Artists extends Static {
    constructor (client) {
        super(client);
        this.audio = new AudioRequests(client);
        this.PlaylistsStatic = new PlaylistsStatic(client);
    }

    get (params = {}) {
        return new Promise((resolve, reject) => {
            if (!params.artist) {
                return reject(new Error("Null artist is not acceptable"));
            }

            params.artist = params.artist.toLowerCase();
            this.request({}, true, true, `/artist/${params.artist}`)
                .then(async ({ html }) => {
                    try {
                        const root = HTMLParser.parse(html);
            
                        const name = root.querySelector(".ArtistCover__title")
                            .text;
            
                        const cover = root.querySelector(".ArtistCover__image")
                            .attributes.style
                            .match(/background-image: url\('(.*?)'\)/)[1];
            
                        const data_audios = root.querySelectorAll(".audio_item")
                            .map(a => JSON.parse(a.attributes["data-audio"]));
                            
                        const audios = params.raw 
                            ? this.audio.getRawAudios(data_audios)
                            : await this.audio.getNormalAudios(data_audios);
            
                        const pl_objects = root.querySelectorAll(".audioPlaylists__item");
                        const playlists = pl_objects.map(object => this.PlaylistsStatic.buildPlaylistsMobile(object));
                        
                        return resolve({
                            name,
                            cover,
                            audios,
                            playlists
                        });
                    } catch (e) {
                        return reject(new Error("Can't fetch artist due internal VK error"));
                    }
                })
                .catch(reject);
        });
    }
}

module.exports = Artists;