const fetch = require("node-fetch-retry");

const Static = require("../static");

class OfficialAPI extends Static {
    constructor(client, vk, params = {}) {
        super(client, params);
        this.vk = vk;
    }

    async call (endpoint, params = {}, form = {}) {
        const query = new URLSearchParams({
            ...params,
            v: this.vk.api.options.apiVersion,
            access_token: this.vk.api.options.token
        }).toString();

        const url = `https://api.vk.com/method/${endpoint}?${query}`;

        if (this.params.debug) {
            console.log(url);
        }

        const request = await fetch(url, {
            method: params.method || "GET",
            body: params.method === "POST" ? new URLSearchParams(form) : undefined,

            headers: {
                "User-Agent": params.userAgent || this.VKAndroidAppUA
            }
        });

        const json = await request.json();
        if (json.response) return json.response;
        else return Promise.reject(json.error);
    }

    async check() {
        const response = await this.call("audio.get", {
            owner_id: this.vk.user,
            count: 1
        }).catch(error => (error));

        return !("error_code" in response);
    }
};

module.exports = OfficialAPI;