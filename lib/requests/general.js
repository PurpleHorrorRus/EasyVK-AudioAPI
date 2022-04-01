const PlaylistsStatic = require("../static/playlists");
const SearchRequests = require("./search");

class GeneralRequests extends PlaylistsStatic {
    constructor (client, vk, params = {}) {
        super(client, vk, params);

        this.search = new SearchRequests(client, vk, params);

        this.section = "general";
    }

    async load (params = {}) {
        const page = await this.getRawGeneralPage();

        return [
            await this.getRecommended(page[0], params),
            ...this.buildCollections(page)
        ];
    }

    async getRawGeneralPage () {
        if (this.rawRecomsPage) {
            return this.rawRecomsPage;
        }

        const { payload } = await this.getSection({ section: this.section });
        this.rawRecomsPage = payload[1];
        setTimeout(async () => await this.getRawGeneralPage(), 60 * 1000 * 60);
        return this.rawRecomsPage;
    }

    async usersPlaylists () {
        const html = await this.search.getByBlock({
            block: "playlists_ugc",
            section: "general",
            page: true
        });
        
        return this.builder(html);
    }
}

module.exports = GeneralRequests;