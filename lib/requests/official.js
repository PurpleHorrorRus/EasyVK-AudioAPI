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
            v: "5.133",
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

        return (await request.json())?.response || {
            error: true,
            message: "Official API not supported on this account. \
            Please, disable Protection from suspicious apps in VK ID security settings"
        };
    }

    async check() {
        const response = await this.call("audio.get", {
            owner_id: this.vk.user,
            count: 1
        });

        return !("error" in response);
    }
};

module.exports = OfficialAPI;