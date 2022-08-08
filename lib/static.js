const fs = require("fs");
const path = require("path");

const { FormData } = require("formdata-node");
const { fileFromPathSync } = require("formdata-node/file-from-path");

const { machineIdSync } = require("node-machine-id");
class Static {
    constructor (client, vk) {
        this.client = client;
        this.vk = vk;
        this.user = vk.user;
        this.uploader = vk.upload;
        this.uuid = machineIdSync({ original: true });

        this.genres = {
            1: "Rock",
            2: "Pop",
            3: "Rap & Hip-Hop",
            4: "Easy Listening",
            5: "Dance & House",
            6: "Instrumental",
            7: "Metal",
            8: "Dubstep",
            10: "Drum & Bass",
            11: "Trance",
            12: "Chanson",
            13: "Ethnic",
            14: "Acoustic & Vocal",
            15: "Reggae",
            16: "Classical",
            17: "Indie Pop",
            18: "Other",
            19: "Speech",
            21: "Alternative",
            22: "Electropop & Disco",
            1001: "Jazz & Blues"
        };

        this.VKAndroidAppUA = "VKAndroidApp/7.7-10445 (Android 11; SDK 30; arm64-v8a; Xiaomi M2003J15SC; ru; 2340x1080)";
    }

    async call (endpoint, params = {}, form = {}) {
        const query = new URLSearchParams({
            ...params,
            v: "5.133",
            access_token: this.vk.api.options.token
        }).toString();

        const url = `https://api.vk.com/method/${endpoint}?${query}`;
        console.log(url);
        const request = await this.client.request(url, form, false, {
            parse: true,
            skipCookies: true,
            userAgent: params.userAgent || this.VKAndroidAppUA
        });

        return request.response;
    }

    async uploadToServer (url, file, field = "file") {
        file = path.resolve(file);

        if (!fs.existsSync(file)) {
            throw new Error(`File not found at path ${file}`);
        }

        const formData = new FormData();
        formData.set(field, fileFromPathSync(file));

        return await this.vk.upload.upload(url, {
            formData,
            timeout: 0,
            forceBuffer: true
        }); 
    }

    async mainPage () {
        if (this.mainPageCache) {
            return this.mainPageCache;
        }

        this.mainPageCache = await this.client.requestEndpoin();
        setTimeout(() => this.mainPageCache = null, 60 * 1000 * 60);
        return this.mainPageCache;
    }

    async getSection (params = {}) {
        if (!params.section) {
            throw new Error("You must to specify section");
        }

        const response = await this.client.requestEndpoint({ 
            ...params,
            act: "section",
            al: 1,
            claim: 0,
            is_layer: 0,
            owner_id: params.owner_id || this.user,
            section: params.section 
        });

        return response.payload[1][1]; 
    }
}

module.exports = Static;