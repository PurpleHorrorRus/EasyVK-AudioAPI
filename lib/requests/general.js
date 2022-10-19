const PlaylistsStatic = require("../static/playlists");
const SearchRequests = require("./search");

class GeneralRequests extends PlaylistsStatic {
    constructor (client, vk) {
        super(client, vk);

        this.search = new SearchRequests(client, vk);

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
        const { payload } = await this.getSection({ section: this.section });
        return payload[1];
    }

    async usersPlaylists () {
        const html = await this.search.getByBlock({
            block: "playlists_ugc",
            section: this.section,
            page: true
        });

        return this.builder(html);
    }
}

module.exports = GeneralRequests;