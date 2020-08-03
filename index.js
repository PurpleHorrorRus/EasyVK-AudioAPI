const staticMethods = require("./lib/staticMethods");

const Audio = require("./lib/requests/audio");
const Playlists = require("./lib/requests/playlists");
const Search = require("./lib/requests/search");
const Artists = require("./lib/requests/artists");
const Recoms = require("./lib/requests/recoms");
class AudioAPI extends staticMethods {
    constructor (client) {
        super(client);
        this.audio = new Audio(client);
        this.playlists = new Playlists(client);
        this.search = new Search(client);
        this.artists = new Artists(client);
        this.recoms = new Recoms(client);
    }

    getFriendsUpdates () {
        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            const res = await this.request({
                act: "section",
                al: 1,
                claim: 0,
                is_layer: 0,
                owner_id: uid,
                section: "updates"
            }).catch(reject);
            let list = [];
            const { playlists } = res.payload[1][1];

            const map = playlists.map(e => e.list).filter(e => e.length);
            map.forEach(e => e.length ? list = list.concat(e) : list = [...list, e]);

            const audios = await this.audio.getNormalAudios(list);
            return resolve(audios);
        });
    }

    // --------------------- STATUS ----------------------

    getStatusExportHash () {
        return new Promise(async resolve => {
            const res = await this.request({ retOnlyBody: true }, false);
            const hash = res.match(/statusExportHash: \'(.*?)\'/)[1];
            this.statusExportHash = hash;
            return resolve(hash);
        });
    }

    toggleAudioStatus (params = {}) {

        /*
            enable: boolean
            raw_audio_id: string
            owner_id?: number
        */

        return new Promise(async (resolve ,reject) => {
            await this.request({
                act: "toggle_status",
                al: 1,
                exp: params.enable !== false ? 1 : 0,
                hash: this.statusExportHash || await this.getStatusExportHash(),
                id: params.raw_audio_id,
                oid: params.owner_id ? Number(params.owner_id) : this.user_id,
                top: 0
            }).catch(reject);
            
            return resolve(true);
        });
    }
    
    changeAudioStatus (params = {}) {

        /*
            raw_audio_id: string
        */

        return new Promise(async (resolve, reject) => {
            await this.request({
                act: "audio_status",
                al: 1,
                hash: this.statusExportHash || await this.getStatusExportHash(),
                full_id: params.raw_audio_id,
                top: 0
            }).catch(reject);
            
            return resolve(true);
        });
    }
}

module.exports = AudioAPI;