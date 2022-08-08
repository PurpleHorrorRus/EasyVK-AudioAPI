const Static = require("../static");
const ArtistsStatic = require("../static/artists");

class ExploreRequests extends Static {
    constructor (client, vk) {
        super(client, vk);

        this.ArtistsStatic = new ArtistsStatic(client, vk);
    }

    async load () {
        let blocks = [];
        let nextFrom = "start";

        const explore = await this.getSection({
            section: "explore"
        });

        while (nextFrom) {
            const response = await this.call("catalog.getSection", {
                section_id: explore.sectionId,
                start_from: nextFrom === "start" ? "" : nextFrom
            });
            
            const formatted = this.ArtistsStatic.formatBlocks(response);
            blocks = blocks.concat(formatted);
            nextFrom = response.section.next_from;
        }
        
        return blocks;
    }
}

module.exports = ExploreRequests;