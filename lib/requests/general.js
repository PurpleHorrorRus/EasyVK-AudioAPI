const PlaylistsStatic = require("../static/playlists");
const SearchRequests = require("./search");

class GeneralRequests extends PlaylistsStatic {
    constructor (client, vk, params) {
        super(client, params);
        this.vk = vk;

        this.SearchRequests = new SearchRequests(client, vk, params);

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
        const { payload } = await this.getSection({
            section: this.section,
            owner_id: this.vk.user
        });

        return payload[1];
    }

    async usersPlaylists () {
        const html = await this.SearchRequests.getByBlock({
            block: "playlists_ugc",
            section: this.section,
            page: true
        });

        return this.builder(html);
    }
}

module.exports = GeneralRequests;