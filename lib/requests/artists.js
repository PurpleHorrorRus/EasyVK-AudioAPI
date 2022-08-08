const ArtistsStatic = require("../static/artists");

class Artists extends ArtistsStatic {
    constructor (client, vk) {
        super(client, vk);
    }

    async get (artist) {
        const page = await this.call("catalog.getAudioArtist", {
            artist_id: this.formatArtist(artist)
        });

        const response = await this.call("catalog.getSection", {
            section_id: page.catalog.sections[0].id
        });
    
        return this.formatBlocks(response);
    }

    async audio (artist, params = {}) {
        return await this.call("audio.getAudiosByArtist", {
            artist_id: this.formatArtist(artist),
            count: Math.min(params.count, 5000) || 100,
            offset: params.offset || 0
        });
    }

    async playlists (artist, params = {}) {
        return await this.call("audio.getAlbumsByArtist", {
            artist_id: this.formatArtist(artist),
            count: Math.min(params.count, 5000) || 100,
            offset: params.offset || 0
        });
    }
}

module.exports = Artists;