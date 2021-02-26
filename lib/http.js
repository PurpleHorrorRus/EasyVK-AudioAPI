/*
    The idea and original code - https://github.com/ciricc
*/

const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs");
const querystring = require("querystring");
const https = require("https");

const CookieStore = require("tough-cookie-file-store").FileCookieStore;
const {
    CookieJar,
    Cookie
} = require("tough-cookie");

const configuration = {
    agent: new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 30000
    }),

    jar: null,
    cookiesPath: path.join("cookies.json"),
    headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "User-Agent": "VKAndroidApp/6.2-5112 (Android 6.0; SDK 23; arm64-v8a; alps Razar; ru; 1280x720)",
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: "",
        "x-requested-with": "XMLHttpRequest"
    },

    params: {}
};

class HTTPClient {
    constructor(vk) {
        this.vk = vk;
        this.user_id = vk.user;
    }

    async request(url, form = {}, post = true, options) {
        const headers = configuration.headers;
        const method = post ? "POST" : "GET";

        headers.Cookie = configuration.jar.getCookiesSync(url).join("; ");

        const common = {
            method,
            agent: configuration.agent,
            headers,
            cache: "no-store"
        };

        const opts = options ? {
            ...common,
            ...options
        } : {
            ...common,
            body: !post ? undefined : querystring.stringify(form)
        };

        const response = await fetch(url, opts);
        const cookies = response.headers.raw()["set-cookie"];
        configuration.headers.Cookie = cookies.map(Cookie.parse);
        configuration.headers.Cookie.forEach(cookie => configuration.jar.setCookie(cookie, response.url, () => {}));

        return response;
    }

    async requestEndpoint(form = {}, post = true, isMobile = false, file = "al_audio.php") {
        if (isMobile && file === "al_audio.php") {
            file = "audio.php";
        }

        const response = await this.request(`https://${isMobile ? "m." : ""}vk.com/${file}`, form, post);
        const body = await response.textConverted();

        return this.parseJSON(body);
    }

    validateJSON(text) {
        try {
            JSON.parse(text);
            return true;
        } catch (e) {
            return false;
        }
    }

    parseJSON(body) {
        if (this.validateJSON(body)) {
            return JSON.parse(body);
        } else {
            if (body.substring(0, 4) === "<!--") {
                try {
                    return JSON.parse(body.replace("<!--", ""));
                } catch (e) {
                    return body;
                }
            }

            return body;
        }
    }

    getCaptcha(PostLoginURL, body, params = {}) {
        const err = {
            error: true,
            message: "Captcha error"
        };

        let captchaUrl = body.match(/\/captcha.php([^"]+)/);
        captchaUrl = `https://vk.com${captchaUrl[0]}`;
        captchaUrl = captchaUrl.replaceAll("\\", "");

        if (captchaUrl) {
            const captchaSid = captchaUrl.match(/sid=([0-9]+)/);

            err.PostLoginURL = PostLoginURL;
            err.captcha = true;
            err.captchaUrl = captchaUrl;
            err.captchaSid = Number(captchaSid[1]);
            err.params = params;
        }

        return err;
    }

    get2FACode(checkCodeURL) {
        return {
            error: true,
            message: "Captcha error",
            tfa: true,
            checkCodeURL
        };
    }

    async createClient() {
        await this.requestEndpoint({}, false, true, "fv?to=/mail?_fm=mail&_fm2=1");
        return this;
    }

    async login(params = {}) {
        configuration.params = params;

        if (!params.username || !params.password) {
            throw new Error("Need auth by login and password");
        }

        configuration.headers.Cookie = "";
        const cookiesPath = params.cookies !== undefined ? params.cookies : configuration.cookiesPath;

        const isValidSession = await (async () => {
            if (fs.existsSync(cookiesPath)) {
                if (this.validateJSON(fs.readFileSync(cookiesPath))) {
                    configuration.jar = new CookieJar(new CookieStore(cookiesPath));
                    return await this.validateSession();
                }
            }

            return false;
        })();

        if (isValidSession) {
            return await this.createClient();
        }

        configuration.jar = new CookieJar(new CookieStore(cookiesPath));

        const response = await this.request("https://m.vk.com/", false);
        let body = await response.text();
        body = body.replaceAll("\\", "").replaceAll("\\\"", "\"");

        if (!/action="(.*?)"/.test(body)) {
            return await this.createClient();
        } else {
            const [, PostLoginURL] = body.match(/action="(.*?)"/);
            return await this.actLogin(PostLoginURL, params);
        }
    }

    async actLogin(PostLoginURL, params) {
        const authParams = {
            captcha_sid: params.captcha_sid,
            captcha_key: params.captcha_key,
            email: params.username,
            pass: params.password
        };

        let response = await this.request(PostLoginURL, authParams, true);
        let body = await response.text();

        if (/\/captcha.php([^"]+)/.test(body)) {
            throw this.getCaptcha(PostLoginURL, body, params);
        }

        if (body.match(/service_msg service_msg_warning/g)) {
            throw {
                error: true,
                message: "Invalid login or password",
                invalidCredits: true
            };
        }

        if (/act=authcheck/.test(body)) {
            response = await this.request("https://m.vk.com/login?act=authcheck", {}, false);
            body = await response.text();
            body = body.replaceAll("\\", "").replaceAll("\\\"", "\"");

            const [, checkCodeURL] = body.match(/action="(.*?)"/);
            throw this.get2FACode(`https://m.vk.com${checkCodeURL}`);
        }

        return await this.createClient();
    }

    async validateSession() {
        const res = await this.request("https://vk.com/al_im.php", {
            act: "a_dialogs_preload",
            al: 1,
            gid: 0,
            im_v: 3,
            rs: ""
        }, true);

        const body = await res.text();
        const json = this.parseJSON(body);

        return Number(json.payload[0]) === 0;
    }

    async final(json, params = {}) {
        if (json.type === 1 && json.hard === 0) {
            return this.get2FACode(params.PostLoginURL.match(/(.*?)&code/)[1]);
        } else {
            switch (json.type) {
            case 3: {
                return this.getCaptcha(params.PostLoginURL, json.html, {});
            }
            default: {
                await this.request(`https://m.vk.com${json.location}`, {}, false);
                return {
                    error: false
                };
            }
            }
        }
    }

    async solveCaptcha(params) {
        const response = await this.request(params.PostLoginURL, {
            captcha_sid: params.captcha_sid,
            captcha_key: params.captcha_key
        });

        const body = await response.text();
        const json = this.parseJSON(body);

        const final = await this.final(json, params);

        if (final.error) {
            throw final;
        }

        return await this.createClient();
    }

    async auth2FA(params) {
        const response = await this.request(params.checkCodeURL, {
            _ajax: 1,
            code: params.code,
            remember: 1
        });

        const body = await response.text();
        const json = this.parseJSON(body);

        if (json.location === "/login?act=authcheck") {
            throw this.get2FACode(params.checkCodeURL);
        } else if (json.key === "captcha_key") {
            throw {
                error: true,
                message: "Captcha error",
                captcha: true,
                PostLoginURL: `${params.checkCodeURL}&code=${params.code}`,
                captchaUrl: `https://m.vk.com${json.img}`,
                captchaSid: Number(json.post.captcha_sid),
                params: {}
            };
        }

        const final = await this.final(json, params);

        if (final.error) {
            throw final;
        }

        return await this.createClient();
    }
}

module.exports = HTTPClient;