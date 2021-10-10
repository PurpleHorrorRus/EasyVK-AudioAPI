const HTMLParser = require("node-html-parser");
const Promise = require("bluebird");

const AudioRequests = require("./audio");
const SearchRequests = require("./search");

const ArtistsStatic = require("../static/artists");
const RecomsStatic = require("../static/recoms");
const PlaylistsStatic = require("../static/playlists");

class RecomsRequests extends RecomsStatic {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
        this.audio = new AudioRequests(client, vk, params);
        this.PlaylistsStatic = new PlaylistsStatic(client, vk, params);
        this.ArtistsStatic = new ArtistsStatic(client, vk, params);
        this.search = new SearchRequests(client, vk, params);

        this.classes = {
            ...this.classes,
            RECOMS: {
                ARTISTS: {
                    TYPE: ".CatalogBlock__artists_recoms",
                    BLOCKS: ".audio_block_small_item--artist",
                    ID: "data-id"
                },
                NEW_ALBUMS: ".ui_gallery_item",
                COLLECTIONS: ".CatalogBlock__playlists_recoms .CatalogBlock__itemsContainer"
            }
        };
    }

    async artists (section) { 
        const root = HTMLParser.parse(section ? section[0] : (await this.getRawRecomsPage())[0]);
        return {
            artists: root.querySelectorAll(this.classes.RECOMS.ARTISTS.BLOCKS).map(block => this.ArtistsStatic.buildBlock(block)),
            type: root.querySelector(this.classes.RECOMS.ARTISTS.TYPE).attributes[this.classes.RECOMS.ARTISTS.ID]
        };
    }

    async allArtists (type) {
        if (!type) {
            throw new Error("Type must be specified");
        }
        
        const { payload } = await this.request({
            al: 1,
            act: "load_catalog_section",
            section_id: type
        });

        try {
            return this.ArtistsStatic.builder(payload[1][2].join(""));
        } catch (e) {
            return [];
        }
    }

    async collections (section) {
        const parsed = HTMLParser.parse(section?.[0] || await this.getRawRecomsPage());
        const collections = parsed.querySelector(this.classes.RECOMS.COLLECTIONS);
        return this.PlaylistsStatic.builder(collections.innerHTML);
    }

    async playlists (section) {
        return (section || await this.getRawRecomsPage())[1].playlists
            .filter(playlist => playlist.ownerId !== this.user)
            .map(playlist => this.PlaylistsStatic.getPlaylistInfo(playlist));
    }

    async allPlaylists () {
        const html = await this.search.getByBlock({
            block: "playlists",
            section: "recoms",
            page: true
        });
        
        return this.PlaylistsStatic.builder(html);
    }

    async loadRecoms () {
        const section = await this.getRawRecomsPage();
        const [artists, collections, playlists] = await Promise.all([
            this.artists(section),
            this.collections(section), 
            this.playlists(section)
        ]);

        return { artists, collections, playlists };
    }

    async newAlbums (section) {
        const [html] = section || await this.getRawExplorePage();
        const root = HTMLParser.parse(html);

        const a_items = root.querySelectorAll(this.classes.RECOMS.NEW_ALBUMS);
        return a_items.map(item => this.buildAlbum(item)).filter(a => a);
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

    async loadExplore (params = {}) {
        
        /*
            count?: number = 0 (load all songs)
        */

        const section = await this.getRawExplorePage();
        const [albums, releases, chart, playlists] = await Promise.all([
            this.newAlbums(section), 
            this.newReleases(params), 
            this.chart(params),
            this.officialPlaylists(section)
        ]);
       
        return {
            albums,
            releases,
            chart,
            playlists
        };
    }

    async daily (params = {}) {
        const { list } = await this.audio.getByBlock({
            ...params,
            block: "daily_recoms"
        });
        
        return list;
    }

    async weekly (params = {}) {
        const { list } = await this.audio.getByBlock({
            ...params,
            block: "weekly_recoms"
        });
        
        return list;
    }

    async getSection (params = {}) {

        /*
            section: String
        */
        
        if (!params.section) {
            throw new Error("You must to specify section");
        }

        return await this.request({ 
            act: "section",
            al: 1,
            claim: 0,
            is_layer: 0,
            owner_id: this.user,
            section: params.section 
        });
    }

    async getRawRecomsPage () {
        if (this.rawRecomsPage) {
            return this.rawRecomsPage;
        }

        const { payload } = await this.getSection({ section: "recoms" });
        this.rawRecomsPage = payload[1];
        setTimeout(async () => await this.getRawRecomsPage(), 60 * 1000 * 60);
        return this.rawRecomsPage;
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

module.exports = RecomsRequests;