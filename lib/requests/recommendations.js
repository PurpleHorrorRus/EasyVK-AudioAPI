const Static = require("../static");
const ArtistsStatic = require("../static/artists");

class Recommendations extends Static {
    constructor(client, vk, params) {
        super(client, params);
        this.vk = vk;

        this.ArtistsStatic = new ArtistsStatic;
    }

    async onboarding (params = {}) {
        const response = await this.request({
            act: "get_recoms_onboarding",
            al: 1,

            ...(params.more
                ? { start_from: params.more?.next_from }
                : { load_script: 0 })
        });

        const payload = this.ArtistsStatic.payload(response);

        return {
            artists: payload?.artists || [],
            relatedCount: payload?.relatedCount || 5,
            hash: payload.hash,
            next: this.getNextFunction(payload.more, this, "onboarding", params)
        };
    }

    async configure (artists, params = {}) {
        if (!artists || !Array.isArray(artists) || artists.length < 5) {
            throw new Error("You must to pick five or more artists ids");
        }

        if (!params.hash) {
            throw new Error("You must to pass hash fetched from recommendations.onboarding()");
        }

        const artistsParams = {};

        for (let i = 0; i < artists.length; i++) {
            artistsParams[`artists[${i}]`] = String(artists[i]);
        }

        return await this.request({
            act: "finish_recoms_onboarding",
            al: 1,
            hash: params.hash,
            ...artistsParams
        });
    }
}

module.exports = Recommendations;