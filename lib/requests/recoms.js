const HTMLParser = require("node-html-parser");
const Promise = require("bluebird");

const AudioRequests = require("./audio");
const SearchRequests = require("./search");

const ArtistsStatic = require("../static/artists");
const RecomsStatic = require("../static/recoms");
const PlaylistsStatic = require("../static/playlists");

class RecomsRequests extends RecomsStatic {
    constructor (client, params) {
        super(client, params);
        this.audio = new AudioRequests(client, params);
        this.PlaylistsStatic = new PlaylistsStatic(client, params);
        this.search = new SearchRequests(client, params);
    }

    async getCollections () {
        const html = await this.getSection({ section: "recoms" });
            
        const parsed = HTMLParser.parse(html);
        const objects = parsed.querySelectorAll(".ui_gallery_item");

        const collections = objects.map(object => this.buildCollection(object)).filter(c => c);
        return collections;
    }

    async getNewAlbums () {
        const payload = this.rawExplorePage || await this.getRawExplorePage();

        const html = payload[1][0];
        const root = HTMLParser.parse(html);

        const a_items = root.querySelectorAll(".ui_gallery_item");

        const albums = a_items.map(item => this.buildAlbum(item)).filter(a => a);
        return albums;
    }

    async getRecomsArtsits () {
        const html = this.rawRecomsPage || await this.getRawRecomsPage();
            
        try {
            const root = HTMLParser.parse(html);
            const type = root.querySelector(".CatalogBlock__artists_recoms").attributes["data-id"];
            const artists = root.querySelectorAll(".audio_block_small_item").map(block => ArtistsStatic.buildBlock(block));

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

    async getAllRecomsArtsits (type) {
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

    async getNewReleases (params = {}) {
        const new_songs = await this.search.getByBlock({
            block: "new_songs",
            section: "explore",
            ...params
        });
        
        return new_songs;
    }

    async getChart (params = {}) {
        const chart = await this.search.getByBlock({
            block: "chart",
            section: "explore",
            ...params
        });
        
        return chart;
    }

    async getOfficialPlaylists () {
        const payload = this.rawExplorePage || await this.getRawExplorePage();

        const html = payload[1][0];
        let playlists = this.PlaylistsStatic.getGenreByHTML(html);

        const section = payload[1][1];
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

        const [collections, albums, new_releases, chart, playlists] = await Promise.all([
            this.getCollections(), 
            this.getNewAlbums(), 
            this.getNewReleases(params), 
            this.getChart(params),
            this.getOfficialPlaylists()
        ]);
       
        return {
            collections,
            albums,
            new_releases,
            chart,
            playlists
        };
    }

    async getDailyRecoms (params = {}) {
        const daily = await this.search.getByBlock({
            block: "daily_recoms",
            count: params.count || 0
        });
        
        return daily;
    }

    async getWeeklyRecoms (params = {}) {
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

        const res = await this.request({
            section: params.section
        });

        return res;
    }

    async getRawRecomsPage () {
        this.rawRecomsPage = await this.getSection({ section: "recoms" });
        setTimeout(async () => await this.getRawRecomsPage(), 60 * 1000 * 60);
        return this.rawRecomsPage;
    }

    async getRawExplorePage () {
        const { payload } = await this.request({
            act: "section",
            al: 1,
            claim: 0,
            is_layer: 0,
            owner_id: this.user,
            section: "explore"
        });

        this.rawExplorePage = payload;
        setTimeout(async () => await this.getRawExplorePage(), 60 * 1000 * 60); // clear page every hour

        return payload;
    }
}

module.exports = RecomsRequests;