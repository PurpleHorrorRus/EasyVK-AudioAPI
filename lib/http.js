/*
    The idea and original code - https://github.com/ciricc
*/

const fetch = require("node-fetch");
const path = require("path");
const querystring = require("querystring");
const https = require("https");

const CookieStore = require("tough-cookie-file-store");
const { CookieJar, Cookie } = require("tough-cookie");

const configuration = {
    agent: new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 30000
    }),

    jar: null,
    cookiesPath: path.join("cookies.json"),
    headers: {
        "User-Agent": "VKAndroidApp/6.2-5112 (Android 6.0; SDK 23; arm64-v8a; alps Razar; ru; 1280x720)",
        "content-type": "application/x-www-form-urlencoded",
        cookie: ""
    }
};

const redirectCodes = [301, 302, 303, 307];

class HTTPClient {
    constructor (vk) {
        this.user_id = vk.user;
    }

    async request(url, form = {}, post = true, isMobile = false, options) {
        const headers = configuration.headers;
        const method = post ? "POST" : "GET";

        if (isMobile && post) {
            headers["x-requested-with"] = "XMLHttpRequest";
        }

        const common = {
            method,
            agent: configuration.agent,
            headers
        };

        const opts = options ? {
            ...common,
            ...options
        } : {
            ...common,
            body: !post ? undefined : querystring.stringify(form),
            redirect: "manual"
        };

        const response = await fetch(url, opts);
        configuration.headers.cookie = response.headers.raw()["set-cookie"].map(Cookie.parse);
        configuration.headers.cookie.forEach(cookie => configuration.jar.setCookie(cookie, url, () => {}));
        configuration.headers.cookie = configuration.jar.getCookiesSync(url).join("; ");

        if (~redirectCodes.indexOf(response.status)) {
            return await this.request(response.headers.get("location"), null, false, false, {
                method: response.status === 307 ? options.method : "GET",
                body: response.status === 307 ? options.body : null,
                follow: options !== undefined && options.follow !== undefined ? options.follow - 1 : undefined
            });
        }

        return response;
    }

    async requestEndpoint(form = {}, post = true, isMobile = false, file = "al_audio.php") {
        const response = await this.request(`https://${isMobile ? "m." : ""}vk.com/${file}`, form, post, isMobile);
        const body = await response.text();

        try { return JSON.parse(body); }
        catch (e) { return body; }
    }

    getContentType(response) {
        return response.headers.get("content-type").match(/(.*?);/)[1];
    }

    async login(params = {}) {
        if (!params.username || !params.password) {
            return new Error("Need auth by login and password");
        }

        const cookiesPath = params.cookies !== undefined ? params.cookies : configuration.cookiesPath;
        configuration.jar = new CookieJar(
            new CookieStore(cookiesPath)
        );

        const response = await this.request("https://m.vk.com/", null, false);
        const body = await response.text();
        const [, PostLoginURL] = body.match(/action="(.*?)"/);
        return await this.actLogin(PostLoginURL, params);
    }

    async actLogin(PostLoginURL, params) {
        const response = await this.request(PostLoginURL, {
            email: params.username,
            pass: params.password
        });
        
        const body = await response.text();
        if (body.match(/service_msg service_msg_warning/g)) {
            throw new Error("Invalid login or password");
        }

        await this.requestEndpoint({}, false, true, "fv?to=/mail?_fm=mail&_fm2=1");
        return this;
    }
}

module.exports = HTTPClient;