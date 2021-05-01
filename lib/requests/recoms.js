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
        this.search = new SearchRequests(client, vk, params);
    }

    async artists (section) { 
        try {
            const root = HTMLParser.parse(section ? section[0] : (await this.getRawRecomsPage())[0]);

            const type = root.querySelector(".CatalogBlock__artists_recoms")
                .attributes["data-id"];

            const artists = root.querySelectorAll(".audio_block_small_item")
                .map(block => ArtistsStatic.buildBlock(block));

            return {
                artists,
                type
            };
        } catch (e) {
            return {
                artists: [],
                type: ""
            };
        }
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
            return ArtistsStatic.build(payload[1][2].join(""));
        } catch (e) {
            return [];
        }
    }

    async collections (section) {
        const parsed = HTMLParser.parse(section ? section[0] : (await this.getRawRecomsPage())[0]);
        const objects = parsed.querySelectorAll(".ui_gallery_item");

        const collections = objects.map(object => this.buildCollection(object)).filter(c => c);
        return collections;
    }

    async playlists (section) {
        return (section ? section[1] : (await this.getRawRecomsPage())[1]).playlists
            .filter(playlist => playlist.ownerId !== this.user)
            .map(playlist => this.PlaylistsStatic.getPlaylistInfo(playlist));
    }

    async allPlaylists () {
        const html = await this.search.getByBlock({
            block: "playlists",
            section: "recoms",
            page: true
        });
        
        return this.PlaylistsStatic.build(html);
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

        const a_items = root.querySelectorAll(".ui_gallery_item");

        const albums = a_items.map(item => this.buildAlbum(item)).filter(a => a);
        return albums;
    }

    async newReleases (params = {}) {
        const new_songs = await this.search.getByBlock({
            block: "new_songs",
            section: "explore",
            ...params
        });
        
        return new_songs;
    }

    async chart (params = {}) {
        const audios = await this.search.getByBlock({
            block: "tracks_chart",
            section: "explore",
            ...params
        });

        return audios.map(a => ({ 
            ...a, 
            chart: a.raw[this.AudioObject.AUDIO_ITEM_INDEX_CHART] 
        }));
    }

    async officialPlaylists (page) {
        const [html, section] = page || await this.getRawExplorePage();
        let playlists = this.PlaylistsStatic.getGenreByHTML(html);

        const { sectionId } = section;
        let next_from = section.next_from || section.nextFrom;
        
        while (next_from.length > 0) {
            const { payload: addition } = await this.request({
                act: "load_catalog_section",
                al: 1,
                section_id: sectionId,
                start_from: next_from
            });

            const catalogs = addition[1][0];
            for (const _c of catalogs) {
                playlists = {
                    ...playlists,
                    ...this.PlaylistsStatic.getGenreByHTML(_c)
                };
            }

            next_from = addition[1][1]
                ? addition[1][1].next_from || addition[1][1].nextFrom
                : "";
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
        const daily = await this.search.getByBlock({
            block: "daily_recoms",
            count: params.count || 0
        });
        
        return daily;
    }

    async weekly (params = {}) {
        const daily = await this.search.getByBlock({
            block: "weekly_recoms",
            count: params.count || 0
        });
        
        return daily;
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