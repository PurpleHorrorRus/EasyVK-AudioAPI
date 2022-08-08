const Promise = require("bluebird");

const Static = require("../static");

class GeneralRequests extends Static {
    constructor (client, vk) {
        super(client, vk);
    }

    async load () {
        const section = await this.getSection({
            section: "general"
        });

        return await Promise.map(section.blockIds, async id => {
            const response = await this.call("catalog.getSection", {
                section_id: id
            });

            return response;
        }, { concurrency: 1 });
    }
}

module.exports = GeneralRequests;