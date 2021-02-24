/*
    The idea and original code - https://github.com/ciricc
*/

const fetch = require("node-fetch");
const path = require("path");
const querystring = require("querystring");
const https = require("https");

const CookieStore = require("tough-cookie-file-store");
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:85.0) Gecko/20100101 Firefox/86.0",
        "content-type": "application/x-www-form-urlencoded",
        cookie: ""
    },

    params: {}
};

const redirectCodes = [301, 302, 303, 307];

class HTTPClient {
    constructor(vk) {
        this.vk = vk;
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
        if (isMobile && file === "al_audio.php") {
            file = "audio.php";
        }

        const response = await this.request(`https://${isMobile ? "m." : ""}vk.com/${file}`, form, post, isMobile);
        const body = await response.textConverted();

        return this.parseJSON(body);
    }

    parseJSON(body) {
        try {
            return JSON.parse(body);
        } catch (e) {
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
        const err = new Error("Captcha error");
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
        const err = new Error("Need 2FA code");

        err.tfa = true;
        err.checkCodeURL = checkCodeURL;

        return err;
    }

    async login(params = {}) {
        configuration.params = params;

        if (!params.username || !params.password) {
            throw new Error("Need auth by login and password");
        }

        configuration.headers.cookie = "";
        const cookiesPath = params.cookies !== undefined ? params.cookies : configuration.cookiesPath;
        configuration.jar = new CookieJar(new CookieStore(cookiesPath));

        const response = await this.request("https://m.vk.com/", true, true);
        let body = await response.text();
        body = body.replaceAll("\\", "").replaceAll("\\\"", "\"");

        const PostLoginURL = /action="(.*?)"/.test(body) ?
            body.match(/action="(.*?)"/)[1] :
            body.match(/action=\\\"(.*?)\\\"/)[1];

        return /^https?:\/\//i.test(PostLoginURL) ?
            await this.actLogin(PostLoginURL, params) :
            this;
    }

    async actLogin(PostLoginURL, params) {
        const authParams = {
            captcha_sid: params.captcha_sid,
            captcha_key: params.captcha_key,
            email: params.username,
            pass: params.password
        };

        let response = await this.request(PostLoginURL, authParams, true, true);
        let body = await response.text();

        if (/\/captcha.php([^"]+)/.test(body)) {
            throw this.getCaptcha(PostLoginURL, body, params);
        }

        if (body.match(/service_msg service_msg_warning/g)) {
            const err = new Error("Invalid login or password");
            err.invalidCredits = true;
            throw err;
        }

        if (/act=authcheck/.test(body)) {
            response = await this.request("https://m.vk.com/login?act=authcheck", {}, false, false);
            body = await response.text();
            body = body.replaceAll("\\", "").replaceAll("\\\"", "\"");

            const [, checkCodeURL] = body.match(/action="(.*?)"/);
            throw this.get2FACode(`https://m.vk.com${checkCodeURL}`);
        }

        await this.requestEndpoint({}, false, true, "fv?to=/mail?_fm=mail&_fm2=1");
        return this;
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
                break;
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

        if (final instanceof Error) {
            throw final;
        }

        return this;
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
            const err = new Error("Captcha error");
            err.captcha = true;

            err.PostLoginURL = `${params.checkCodeURL}&code=${params.code}`;
            err.captchaUrl = `https://m.vk.com${json.img}`;
            err.captchaSid = Number(json.post.captcha_sid);
            err.params = {};

            throw err;
        }

        const final = await this.final(json, params);

        if (final instanceof Error) {
            throw final;
        }

        return this;
    }
}

module.exports = HTTPClient;