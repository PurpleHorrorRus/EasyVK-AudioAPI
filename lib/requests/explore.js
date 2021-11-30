const HTMLParser = require("node-html-parser");
const Promise = require("bluebird");

const AudioRequests = require("./audio");
const SearchRequests = require("./search");

const ExploreStatic = require("../static/explore");
const PlaylistsStatic = require("../static/playlists");
const ArtistsStatic=require("../static/artists");

class ExploreRequests extends ExploreStatic {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
        this.audio = new AudioRequests(client, vk, params);
        this.PlaylistsStatic = new PlaylistsStatic(client, vk, params);
        this.search = new SearchRequests(client, vk, params);

        this.classes = {
            ...this.classes,
            RECOMS: { NEW_ALBUMS: ".CatalogBlock__explore_banners .ui_gallery_item" }
        };
    }

    async newAlbums (section) {
        const [html] = section || await this.getRawExplorePage();
        const root = HTMLParser.parse(html);

        const a_items = root.querySelectorAll(this.classes.RECOMS.NEW_ALBUMS);
        return a_items.map(item => this.buildAlbum(item)).filter(a => a);
    }

    async newArtists (params = {}) {
        const { list } = await this.audio.getByBlock({
            block: "new_artist",
            section: "explore",
            ...params
        });

        return list;
    }

    async newReleases (params = {}) {
        const { list } = await this.audio.getByBlock({
            block: "new_songs",
            section: "explore",
            ...params
        });

        return list;
    }

    async chart (params = {}) {
        const { list } = await this.audio.getByBlock({
            block: "tracks_chart",
            section: "explore",
            ...params
        });

        return list;
    }

    async officialPlaylists () {
        const [, section] = await this.getRawExplorePage();

        let data = await this.getDataWithMore(this.PlaylistsStatic, { 
            section_id: section.sectionId, 
            start_from: section.next_from || section.nextFrom
        }, { page: true });

        let playlists = this.PlaylistsStatic.buildCollections(data.payload[1][0].join(""));
        let more = this.parseMore(data.payload[1][1]);

        while (more) {
            data = await this.getDataWithMore(this.PlaylistsStatic, more, { page: true });
            playlists = [...playlists, ...this.PlaylistsStatic.buildCollections(data.payload[1][0].join(""))];
            more = this.parseMore(data.payload[1][1]);
        }

        return playlists;
    }

    async load (params = {}) {
        /*
            count?: number = 0 (load all songs)
        */

        const section = await this.getRawExplorePage();
        const [albums, artists, releases, chart, playlists] = await Promise.all([
            this.newAlbums(section), 
            this.newArtists(params),
            this.newReleases(params), 
            this.chart(params),
            this.officialPlaylists(section)
        ]);

        return {
            albums,
            artists,
            releases,
            chart,
            playlists: [...this.PlaylistsStatic.buildCollections(section[0]), ...playlists]
        };
    }

    async getRawExplorePage () {
        if (this.rawExplorePage) {
            return this.rawExplorePage;
        } 

        const { payload } = await this.getSection({ section: "explore" });
        this.rawExplorePage = payload[1];
        setTimeout(async () => await this.getRawExplorePage(), 60 * 1000 * 60); // clear page every hour

        return this.rawExplorePage;
    }
}

module.exports = ExploreRequests;