
const { VK } = require("vk-io");
const Promise = require("bluebird");

const Static = require("./lib/static");

const HTTPClient = require("./lib/http");

const Audio = require("./lib/requests/audio");
const Playlists = require("./lib/requests/playlists");
const Search = require("./lib/requests/search");
const Artists = require("./lib/requests/artists");
const General = require("./lib/requests/general");
const Explore = require("./lib/requests/explore");
const OfficialAPI = require("./lib/requests/official");

const defaultParams = {
    debug: false
};

class AudioAPI extends Static {
    constructor (token, vkParams = {}, params = defaultParams) {
        super(null, params);

        this.vk = new VK({
            token,

            apiHeaders: {
                "User-Agent": this.VKAndroidAppUA
            },

            ...vkParams
        });

        this.params = params;
    }

    async login (credits, authParams = {}) {
        if (!credits.user) {
            const response = await this.vk.api.users.get();
            this.vk.user = response[0].id;
        } else this.vk.user = credits.user;

        this.client = await new HTTPClient(this.vk).login({
            ...credits,
            ...authParams
        });

        this.audio = new Audio(this.client, this.vk, this.params);
        this.playlists = new Playlists(this.client, this.vk, this.params);
        this.search = new Search(this.client, this.vk, this.params);
        this.artists = new Artists(this.client, this.vk, this.params);
        this.general = new General(this.client, this.vk, this.params);
        this.explore = new Explore(this.client, this.vk, this.params);
        this.official = new OfficialAPI(this.client, this.vk, this.params);

        return this;
    }

    async getAll (params = {}) {
        params.owner_id = params.owner_id ? Number(params.owner_id) : this.vk.user;
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
            owner_id: this.vk.user,
            section: "updates"
        });

        try {
            return await Promise.map(payload[1][1].playlists, async playlist => ({
                owner_id: playlist.ownerId,
                audios: await this.audio.parseAudios(playlist.list, params)
            }));
        } catch (e) {
            return [];
        }
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
            oid: params.owner_id ? Number(params.owner_id) : this.vk.user,
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