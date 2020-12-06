const Static = require("./lib/static");

const Audio = require("./lib/requests/audio");
const Playlists = require("./lib/requests/playlists");
const Search = require("./lib/requests/search");
const Artists = require("./lib/requests/artists");
const Recoms = require("./lib/requests/recoms");
class AudioAPI extends Static {
    constructor (client, params = {}) {
        super(client, params);
        this.audio = new Audio(client, params);
        this.playlists = new Playlists(client, params);
        this.search = new Search(client, params);
        this.artists = new Artists(client, params);
        this.recoms = new Recoms(client, params);

        if (!params.ffmpeg) {
            console.warn("[EasyVK-Audio] You didn't set the path to FFmpeg, you won't be able to convert .m3u8 to .mp3");
        }
    }

    async getAll (params = {}) {
        params.owner_id = params.owner_id ? Number(params.owner_id) : this.user_id;
        params.playlist_id = params.playlist_id ? Number(params.playlist_id) : -1;
        
        return ~params.playlist_id 
            ? this.playlists.getAllSongs(params) 
            : this.audio.getAll(params);
    }

    async getFriendsUpdates (params = {}) {
        const uid = this.user_id;

        const { payload } = await this.request({
            act: "section",
            al: 1,
            claim: 0,
            is_layer: 0,
            owner_id: uid,
            section: "updates"
        });

        let list = [];
        const { playlists } = payload[1][1];

        const map = playlists.map(e => e.list).filter(e => e.length);
        map.forEach(e => e.length ? list = [...list, ...e] : list = [...list, e]);

        const audios = params.raw
            ? this.audio.getRawAudios(list)
            : await this.audio.parse(list);

        return audios;
    }

    // --------------------- STATUS ----------------------

    async getStatusExportHash () {
        const res = await this.request({ retOnlyBody: true }, false);

        const hash = res.match(/statusExportHash: \'(.*?)\'/)[1];
        this.statusExportHash = hash;

        return hash;
    }

    async toggleAudioStatus (params = {}) {

        /*
            enable: boolean
            raw_audio_id: string
            owner_id?: number
        */

        await this.request({
            act: "toggle_status",
            al: 1,
            exp: params.enable !== false ? 1 : 0,
            hash: this.statusExportHash || await this.getStatusExportHash(),
            id: params.raw_audio_id,
            oid: params.owner_id ? Number(params.owner_id) : this.user_id,
            top: 0
        });

        return true;
    }
    
    async changeAudioStatus (params = {}) {

        /*
            raw_audio_id: string
        */

        await this.request({
            act: "audio_status",
            al: 1,
            hash: this.statusExportHash || await this.getStatusExportHash(),
            full_id: params.raw_audio_id,
            top: 0
        });
        
        return true;
    }
}

module.exports = AudioAPI;