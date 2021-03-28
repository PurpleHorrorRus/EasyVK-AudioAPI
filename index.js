const fs = require("fs");
const path = require("path");

const m3u8 = require("./lib/requests/audio_m3u8");

const Static = require("./lib/static");

const HTTPClient = require("./lib/http");

const Audio = require("./lib/requests/audio");
const Playlists = require("./lib/requests/playlists");
const Search = require("./lib/requests/search");
const Artists = require("./lib/requests/artists");
const Recoms = require("./lib/requests/recoms");
class AudioAPI extends Static {
    constructor (vk, credits, params = {}) {
        super({}, vk);
        this.vk = { ...vk, user: credits.user };
        this.credits = credits;

        if (params.ffmpeg) {
            params.ffmpeg.path = path.resolve(params.ffmpeg.path);
            if (fs.existsSync(params.ffmpeg.path)) {
                this.m3u8 = new m3u8(params.ffmpeg);
            } else {
                console.error("Can't find FFmpeg executable on", params.ffmpeg.path);
            }
        }
    }

    async login (params = {}) {
        this.client = await new HTTPClient(this.vk).login({
            ...this.credits,
            ...params
        });

        return {
            audio: new Audio(this.client, this.vk),
            playlists: new Playlists(this.client, this.vk),
            search: new Search(this.client, this.vk),
            artists: new Artists(this.client, this.vk),
            recoms: new Recoms(this.client, this.vk)
        };
    }

    async getAll (params = {}) {
        params.owner_id = params.owner_id ? Number(params.owner_id) : this.user;
        params.playlist_id = params.playlist_id ? Number(params.playlist_id) : -1;
        
        return ~params.playlist_id 
            ? this.playlists.getAllSongs(params) 
            : this.audio.getAll(params);
    }

    async getFriendsUpdates (params = {}) {
        const { payload } = await this.request({
            act: "section",
            al: 1,
            claim: 0,
            is_layer: 0,
            owner_id: this.user,
            section: "updates"
        });

        let list = [];
        const { playlists } = payload[1][1];

        const map = playlists.map(e => e.list).filter(e => e.length);
        map.forEach(e => e.length ? list = [...list, ...e] : list = [...list, e]);

        const audios = params.raw
            ? this.audio.getRawAudios(list)
            : await this.audio.parse(list, params);

        return audios;
    }

    // --------------------- STATUS ----------------------

    async getStatusExportHash () {
        const res = await this.audio.mainPage();

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
            exp: Number(params.enable),
            hash: this.statusExportHash || await this.getStatusExportHash(),
            id: params.raw_audio_id,
            oid: params.owner_id ? Number(params.owner_id) : this.user,
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