const HTMLParser = require("node-html-parser");
const Promise = require("bluebird");

const AudioRequests = require("./audio");
const SearchRequests = require("./search");

const ExploreStatic = require("../static/explore");
const PlaylistsStatic = require("../static/playlists");

class ExploreRequests extends ExploreStatic {
    constructor (client, vk, params) {
        super(client, params);
        this.vk = vk;

        this.AudioRequests = new AudioRequests(client, vk, params);
        this.SearchRequests = new SearchRequests(client, vk, params);
        this.PlaylistsStatic = new PlaylistsStatic(client, vk, params);

        this.classes = {
            ...this.classes,

            RECOMS: {
                NEW_ALBUMS: ".CatalogBlock__explore_banners .ui_gallery_item"
            },

            RADIO: {
                HEADER: ".CatalogBlock__radiostations_header"
            }
        };

        this.section = "explore";
    }

    async newAlbums (section) {
        const [html] = section || await this.getRawExplorePage();
        const root = HTMLParser.parse(html);

        const audioItems = root.querySelectorAll(this.classes.RECOMS.NEW_ALBUMS);
        return audioItems.map(item => this.buildAlbum(item)).filter(Boolean);
    }

    async newArtists (params = {}) {
        const { list } = await this.AudioRequests.getByBlock({
            block: "new_artist",
            section: this.section,
            ...params
        });

        return list;
    }

    async newReleases (params = {}) {
        const { list } = await this.AudioRequests.getByBlock({
            block: "new_songs",
            section: this.section,
            ...params
        });

        return list;
    }

    async chart (params = {}) {
        const { list } = await this.AudioRequests.getByBlock({
            block: "tracks_chart",
            section: this.section,
            ...params
        });

        return list;
    }

    async officialPlaylists (section) {
        const payload = section[1];

        let data = await this.getDataWithMore(this.PlaylistsStatic, {
            section_id: payload.sectionId,
            start_from: payload.next_from || payload.nextFrom
        }, { page: true });

        if (!data.payload[1][0]) {
            return await this.officialPlaylists(section);
        }

        let playlists = this.PlaylistsStatic.buildCollections(data.payload[1][0].join(""));
        let more = this.parseMore(data.payload[1][1]);

        while (more) {
            data = await this.getDataWithMore(this.PlaylistsStatic, more, { page: true });
            playlists = playlists.concat(this.PlaylistsStatic.buildCollections(data.payload[1][0].join("")));
            more = this.parseMore(data.payload[1][1]);
        }

        return playlists;
    }

    async radio ([html, payload]) {
        const playlist = payload.playlists?.find(playlist => {
            return playlist.type === "radio";
        });

        const radioNode = HTMLParser.parse(html)
            .querySelector(this.classes.RADIO.HEADER)?.parentNode;

        if (!playlist || !radioNode) {
            return null;
        }

        return {
            ...this.PlaylistsStatic.buildCollectionPage(radioNode),
            list: playlist.list.map(radio => this.buildRadio(radio))
        };
    }

    async followRadio(radio) {
        const response = await this.request({
            act: !radio.fave ? "follow_radiostation" : "unfollow_radiostation",
            al: 1,
            hash: radio.faveHash,
            id: radio.id
        });

        return response.payload[1][0] === true;
    }

    async load (params = {}) {
        /*
            count?: number = 0 (load all songs)
        */

        const section = await this.getRawExplorePage();
        const [albums, artists, releases, chart, playlists, radio] = await Promise.all([
            this.newAlbums(section),
            this.newArtists(params),
            this.newReleases(params),
            this.chart(params),
            this.officialPlaylists(section),
            this.radio(section)
        ]);

        return {
            albums,
            artists,
            releases,
            chart,
            playlists,
            radio
        };
    }

    async getRawExplorePage () {
        const response = await this.getSection({
            section: this.section,
            owner_id: this.vk.user
        });

        return response.payload[1]
            || await this.getRawExplorePage();
    }
}

module.exports = ExploreRequests;