/*
    The idea and original code - https://github.com/ciricc
*/

const fetch = require("node-fetch-retry");
const path = require("path");
const fs = require("fs");
const querystring = require("querystring");
const https = require("https");
const FormData = require("form-data");

const { CookieJar, Cookie } = require("tough-cookie");
const FileCookieStore = require("tough-cookie-file-store").FileCookieStore;

const globalConfig = require("./configuration.json");

const configuration = {
    agent: new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 30000
    }),

    jar: null,
    cookiesPath: path.join("cookies.json"),
    headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
        Connection: "keep-alive",
        "User-Agent": globalConfig.headers["User-Agent"],
        "Content-Type": "application/x-www-form-urlencoded",
        "x-requested-with": "XMLHttpRequest"
    }
};

const regex = {
    ACTION_LOGIN: /action="(.*?)"/,
    ACT_AUTHCHECK: /act=authcheck/,
    AUTH_CAPTCHA: /\/captcha.php([^"]+)/,
    CAPTCHA_SID: /sid=([0-9]+)/,
    CAPTCHA_URL: /\/captcha.php([^"]+)/,
    CODE: /(.*?)&code/,
    INVALID_CREDITS: /service_msg service_msg_warning/,
};

class HTTPClient {
    constructor (vk) {
        this.vk = vk;
        this.user = vk.user;
    }

    async request (url, form = {}, post = true, options = {}) {
        const requestOptions = {
            method: post ? "POST" : "GET",
            body: post ? querystring.stringify(form) : undefined,
            agent: configuration.agent,
            headers: {
                ...configuration.headers,
                Cookie: configuration.jar.getCookieStringSync(url)
            },
            cache: "no-store",
            redirect: "manual",
            retry: Infinity,
            pause: 1000,
            ...options
        };

        const response = await fetch(url, requestOptions);
        const cookies = response.headers.raw()["set-cookie"].map(Cookie.parse);
        cookies.forEach(cookie => configuration.jar.setCookieSync(cookie, response.url));
        
        if (~[301, 302, 303, 307].indexOf(response.status)) {
            return await this.request(
                response.headers.get("location"),
                response.status === 307 ? requestOptions.body : null,
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

    async upload (url, file) {
        if (!fs.existsSync(file)) {
            throw new Error(`File not found at path ${file}`);
        }

        const form = new FormData({ maxDataSize: Infinity });
        form.append("file", fs.createReadStream(file), { filename: path.basename(file) });

        return await fetch(url, {
            method: "POST",
            body: form,
            headers: {
                ...form.getHeaders(),
                "User-Agent": globalConfig.headers["User-Agent"]
            }
        });
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
        try {
            if (body.substring(0, 4) === "<!--") {
                body = body.replace("<!--", "");
            }

            return JSON.parse(body);
        } catch (e) {
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
        let captchaUrl = body.match(regex.CAPTCHA_URL);
        captchaUrl = this.clearResponse(`https://vk.com${captchaUrl[0]}`);

        if (captchaUrl) {
            return this.getCaptcha(PostLoginURL, captchaUrl, captchaUrl.match(regex.CAPTCHA_SID), params);
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
        setInterval(() => this.request("https://m.vk.com/", false), 60 * 1000 * 20);

        if (await this.validateSession(params.cookies || configuration.cookiesPath)) {
            return this;
        }

        const response = await this.request("https://m.vk.com/", false);
        const body = this.clearResponse(await response.text());

        if (this.validateJSON(body)) {
            await this.request(this.parseJSON(body).location);
            return this;
        }

        if (!regex.ACTION_LOGIN.test(body)) {
            return this;
        }

        if (!params.username || !params.password) {
            throw new Error("Need auth by login and password");
        }
        
        const [, PostLoginURL] = body.match(regex.ACTION_LOGIN);
        return await this.actLogin(PostLoginURL, params);
    }

    async actLogin (PostLoginURL, params = {}) {
        let response = await this.request(PostLoginURL, {
            captcha_sid: params.captcha_sid,
            captcha_key: params.captcha_key,
            email: params.username,
            pass: params.password
        });

        let body = await response.text();

        if (regex.AUTH_CAPTCHA.test(body)) {
            throw this.getCaptchaFromHTML(PostLoginURL, body, params);
        }

        if (regex.INVALID_CREDITS.test(body)) {
            throw {
                error: true,
                message: "Invalid login or password",
                invalidCredits: true
            };
        }

        if (regex.ACT_AUTHCHECK.test(body)) {
            response = await this.request("https://m.vk.com/login?act=authcheck", {}, false);
            body = await response.text();
            body = this.clearResponse(body);

            const [, checkCodeURL] = body.match(regex.ACTION_LOGIN);
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

    async checkErrors (json, params = {}) {
        switch (json.type) {
            case 1: {
                if (json.hard === 0) {
                    return this.get2FACode(params.PostLoginURL.match(regex.CODE)[1]);
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

    async final (json, params = {}) {
        const result = await this.checkErrors(json, params);

        if (result.error) {
            throw result;
        }

        return this;
    }

    async solveCaptcha (params) {
        const response = await this.request(params.PostLoginURL, {
            captcha_sid: params.captcha_sid,
            captcha_key: params.captcha_key
        });

        const body = await response.text();
        const json = this.parseJSON(body);

        return await this.final(json, params);
    }

    async auth2FA (params) {
        const response = await this.request(params.checkCodeURL, {
            _ajax: 1,
            code: params.code,
            remember: 1
        });

        const body = await response.text();
        const json = this.parseJSON(body);

        if (regex.ACT_AUTHCHECK.test(json.location)) {
            throw this.get2FACode(params.checkCodeURL);
        } else if (json.key === "captcha_key") {
            throw this.getCaptcha(
                `${params.checkCodeURL}&code=${params.code}`,
                `https://m.vk.com${json.img}`,
                Number(json.post.captcha_sid)
            );
        }

        return await this.final(json, params);
    }
}

module.exports = HTTPClient;