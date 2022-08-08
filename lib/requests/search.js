const Static = require("../static");

const AudioRequests = require("./audio");

class SearchRequests extends Static {
    constructor (client, vk) {
        super(client, vk);

        this.audio = new AudioRequests(client, vk);
    }

    async query (query, params = {}) {
        if (!query) {
            return false;
        }

        return await this.call("audio.search", {
            q: query || "",
            count: params.count || 100,
            offset: params.offset || 0,
            performer_only: params.performer_only || 0,
            auto_complete: params.auto_complete || 1
        });
    }

    async hints (query) {
        if (!query) {
            return [];
        }
        
        const response = await this.request({
            act: "a_gsearch_hints",
            al: 1,
            q: query,
            section: "audio"
        }, true, false, "hints.php");

        try {
            const payload = response.payload[1][0];
            return payload.map(r => {
                return [r[1], r[3]];
            });
        } catch (_e) { 
            return []; 
        }
    }

    async inAudios (query, params = {}) {
        const section = await this.getSection({
            section: "search",
            owner_id: params.owner_id || this.user,
            q: query
        });

        return await this.call("catalog.getSection", {
            section_id: section.sectionId
        });
    }
}

module.exports = SearchRequests;