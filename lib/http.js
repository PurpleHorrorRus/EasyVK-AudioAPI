/*
    The idea and original code - https://github.com/ciricc
*/

const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs");
const querystring = require("querystring");
const https = require("https");

const { CookieJar, Cookie } = require("tough-cookie");
const FileCookieStore = require("tough-cookie-file-store");

const configuration = {
    agent: new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 30000
    }),

    jar: null,
    cookiesPath: path.join("cookies.json"),
    headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:87.0) Gecko/20100101 Firefox/87.0",
        "Content-Type": "application/x-www-form-urlencoded",
        "x-requested-with": "XMLHttpRequest"
    }
};

class HTTPClient {
    constructor (vk) {
        this.vk = vk;
        this.user = vk.user;
    }

    async request (url, form = {}, post = true, options) {
        const common = {
            method: post ? "POST" : "GET",
            body: post ? querystring.stringify(form) : undefined,
            agent: configuration.agent,
            headers: {
                ...configuration.headers,
                Cookie: configuration.jar.getCookieStringSync(url)
            },
            cache: "no-store",
            redirect: "manual"
        };

        const opts = options ? {
            ...common,
            ...options
        } : common;

        const response = await fetch(url, opts);
        [response.headers.get("set-cookie")]
            .map(Cookie.parse)
            .forEach(cookie => configuration.jar.setCookieSync(cookie, response.url));

        if (~[301, 302, 303, 307].indexOf(response.status)) {
            return await this.request(
                response.headers.get("location"),
                response.status === 307 ? opts.body : null,
                response.status === 307
            );
        }

        return response;
    }

    async requestEndpoint (form = {}, post = true, isMobile = false, file = "al_audio.php") {
        if (isMobile && file === "al_audio.php") {
            file = "audio.php";
        }

        const response = await this.request(`https://${isMobile ? "m." : ""}vk.com/${file}`, form, post);
        const body = await response.textConverted();

        return this.parseJSON(body);
    }

    clearResponse (body) {
        return body.replaceAll("\\", "").replaceAll("\\\"", "\"");
    }

    validateJSON (text) {
        try {
            JSON.parse(text);
            return true;
        } catch (e) {
            return false;
        }
    }

    parseJSON (body) {
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

    getCaptcha (PostLoginURL, captchaUrl, captchaSid, params = {}) {
        return {
            error: true,
            message: "Captcha error",
            captcha: true,
            PostLoginURL,
            src: captchaUrl,
            sid: Number(captchaSid),
            params
        };
    }

    getCaptchaFromHTML (PostLoginURL, body, params = {}) {
        let captchaUrl = body.match(/\/captcha.php([^"]+)/);
        captchaUrl = this.clearResponse(`https://vk.com${captchaUrl[0]}`);

        if (captchaUrl) {
            const captchaSid = captchaUrl.match(/sid=([0-9]+)/);
            return this.getCaptcha(PostLoginURL, captchaUrl, captchaSid, params);
        }

        return {
            error: true,
            message: "Unknown captcha error"
        };
    }

    get2FACode (checkCodeURL) {
        return {
            error: true,
            message: "You need to input 2FA code",
            tfa: true,
            checkCodeURL
        };
    }

    async login (params = {}) {
        const cookiesPath = params.cookies !== undefined ? params.cookies : configuration.cookiesPath;

        if (await this.validateSession(cookiesPath)) {
            return this;
        }

        const response = await this.request("https://m.vk.com/", false);
        let body = await response.text();
        body = this.clearResponse(body);

        if (this.validateJSON(body)) {
            await this.request(this.parseJSON(body).location);
            return this;
        }

        if (!params.username || !params.password) {
            throw new Error("Need auth by login and password");
        }

        if (!/action="(.*?)"/.test(body)) {
            return this;
        } else {
            const [, PostLoginURL] = body.match(/action="(.*?)"/);
            return await this.actLogin(PostLoginURL, params);
        }
    }

    async actLogin (PostLoginURL, params = {}) {
        let response = await this.request(PostLoginURL, {
            captcha_sid: params.captcha_sid,
            captcha_key: params.captcha_key,
            email: params.username,
            pass: params.password
        });

        let body = await response.text();

        if (/\/captcha.php([^"]+)/.test(body)) {
            throw this.getCaptchaFromHTML(PostLoginURL, body, params);
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
            body = this.clearResponse(body);

            const [, checkCodeURL] = body.match(/action="(.*?)"/);
            throw this.get2FACode(`https://m.vk.com${checkCodeURL}`);
        }

        return this;
    }

    async validateSession (cookiesPath) {
        configuration.jar = new CookieJar(new FileCookieStore(cookiesPath));

        if (fs.existsSync(cookiesPath)) {
            if (this.validateJSON(fs.readFileSync(cookiesPath))) {
                const res = await this.request("https://vk.com/al_im.php", {
                    act: "a_dialogs_preload",
                    al: 1,
                    gid: 0,
                    im_v: 3,
                    rs: ""
                });

                const { payload } = await res.json();
                return Number(payload[0]) === 0;
            }
        }

        return false;
    }

    async final (json, params = {}) {
        switch (json.type) {
            case 1: {
                if (json.hard === 0) {
                    return this.get2FACode(params.PostLoginURL.match(/(.*?)&code/)[1]);
                } else {
                    await this.request(`https://m.vk.com${json.location}`, {}, false);
                    return { error: false };
                }
            }
            case 3: {
                return this.getCaptchaFromHTML(params.PostLoginURL, json.html);
            }
            default: {
                await this.request(`https://m.vk.com${json.location}`, {}, false);
                return { error: false };
            }
        }
    }

    async solveCaptcha (params) {
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

        return this;
    }

    async auth2FA (params) {
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
            throw this.getCaptcha(
                `${params.checkCodeURL}&code=${params.code}`,
                `https://m.vk.com${json.img}`,
                Number(json.post.captcha_sid)
            );
        }

        const final = await this.final(json, params);

        if (final.error) {
            throw final;
        }

        return this;
    }
}

module.exports = HTTPClient;