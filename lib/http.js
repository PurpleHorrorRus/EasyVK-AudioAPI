/*
    The idea and original code - https://github.com/ciricc
*/

const fetch = require("node-fetch-retry");
const path = require("path");
const fs = require("fs");
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
        "Content-Type": "application/x-www-form-urlencoded"
    }
};

const regex = {
    ACTION_LOGIN: /action="(.*?)"/,
    ACT_AUTHCHECK: /act=authcheck/,
    AUTH_CAPTCHA: /\/captcha.php([^"]+)/,
    CAPTCHA_SID: /sid=([0-9]+)/,
    CAPTCHA_URL: /\/captcha.php([^"]+)/,
    CODE: /(.*?)&code/,
    SERVICE_ERROR: /service_msg service_msg_warning/,
    SERVICE_ERROR_TEXT: /service_msg_warning(.*)<b>(.*?)</,
    REFRESH_SESSION_REDIRECT_URL: /login\.vk\.com/,

    LOGIN: {
        TO: /\"to\":\"(.*?)\"/,
        IP_H: /ip_h: \'(.*?)\'/,
        LG_DOMAIN_H: /lg_domain_h" value="(.*?)"/,

        TFA_HASH: /Authcheck\.init\('(.*?)'/
    }
};

const urls = {
    GENERAL: "https://vk.com/",
    ACT_LOGIN: "https://login.vk.com/?act=login",
    AUTH_CHECK: "https://vk.com/login?act=authcheck",
    AUTH_CHECK_CODE: "https://vk.com/al_login.php?act=a_authcheck_code"
};

const redirectCodes = [301, 302, 303, 307];

class HTTPClient {
    constructor (vk) {
        this.vk = vk;
        this.user = vk.user;
    }

    async request (url, form = {}, post = true, options = {}) {
        const requestOptions = {
            method: post ? "POST" : "GET",
            body: post ? new URLSearchParams(form) : undefined,
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
        const body = await response.textConverted();
        const cookies = response.headers.raw()["set-cookie"];

        if (!cookies) {
            throw new Error("Cookies are corrupted");
        }

        cookies.forEach(cookie => {
            const parsed = Cookie.parse(cookie);
            configuration.jar.setCookieSync(parsed, response.url);
        });
        
        if (!this.checkBody(body) && redirectCodes.includes(response.status)) {
            if (body && options.refreshingSession) {
                return body;
            }

            return await this.request(
                response.headers.get("location"),
                response.status === 307 ? requestOptions.body : null,
                response.status === 307,
                options
            );
        }

        return body;
    }

    checkBody (response) {
        if (regex.ACTION_LOGIN.test(response)) {
            return response.match(regex.ACTION_LOGIN)[1] !== "play_rate";
        }

        return regex.ACTION_LOGIN.test(response);
    }

    async requestEndpoint (form = {}, post = true, isMobile = false, file = "al_audio.php", options = {}) {
        if (isMobile && file === "al_audio.php") {
            file = "audio.php";
        }

        const url = ["https://", isMobile ? "m." : "", "vk.com/", file].join("");
        return await this.parseJSON(await this.request(url, form, post, options));
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

    clearResponse (response) {
        return response.replaceAll("\\", "").replaceAll("\\\"", "\"");
    }

    validateJSON (text) {
        try {
            JSON.parse(text);
            return true;
        } catch (e) {
            return false;
        }
    }

    parseJSON (response) {
        try {
            if (response.substring(0, 4) === "<!--") {
                response = response.replace("<!--", "");
            }

            return JSON.parse(response);
        } catch (e) {
            return response;
        }
    }

    getCaptcha (sid) {
        return {
            error: true,
            message: "You need to solve captcha",
            captcha: true,
            src: `https://vk.com/captcha.php?sid=${sid}&s=1`,
            sid: Number(sid)
        };
    }

    get2FACode (hash) {
        return {
            error: true,
            message: "You need to input 2FA code",
            tfa: true,
            hash
        };
    }

    async login (params = {}) {
        if (params.cookies) {
            configuration.cookiesPath = params.cookies;
        }

        const cookieStore = new FileCookieStore(configuration.cookiesPath);
        configuration.jar = new CookieJar(cookieStore);

        const response = await this.requestEndpoint({}, false, false, "", { refreshingSession: true });
        if (response && !regex.ACTION_LOGIN.test(response)) {
            return this;
        }
        
        if (!params.username || !params.password) {
            throw new Error("Need auth by login and password");
        }

        return await this.actLogin({
            to: response.match(regex.LOGIN.TO)[1],
            ip_h: response.match(regex.LOGIN.IP_H)[1],
            lg_domain_h: response.match(regex.LOGIN.LG_DOMAIN_H)[1],
            email: params.username,
            pass: params.password
        });
    }

    async actLogin (params = {}) {
        let response = await this.request(urls.ACT_LOGIN, {
            act: "login",
            role: "al_frame",
            expire: "",
            recaptcha: "",
            captcha_sid: params.captcha_sid || "",
            captcha_key: params.captcha_key || "",
            utf8: 1,
            _origin: urls.GENERAL,
            ul: "",
            ...params
        }, true, {
            headers: {
                ...configuration.headers,
                Cookie: configuration.jar.getCookieStringSync(urls.ACT_LOGIN),
                Origin: urls.GENERAL,
                Referer: urls.GENERAL
            }
        });

        if (regex.SERVICE_ERROR.test(response)) {
            throw {
                error: true,
                message: response.match(regex.SERVICE_ERROR_TEXT)[2],
                service: true
            };
        }

        if (regex.ACT_AUTHCHECK.test(response)) {
            response = await this.request(urls.AUTH_CHECK, {}, false);
            const [, hash] = this.clearResponse(response).match(regex.LOGIN.TFA_HASH);
            throw this.get2FACode(hash);
        }

        return this;
    }

    async checkErrors (json, params = {}) {
        const errorCode = Number(json.payload[0]);

        if (json.payload[1][0]) {
            json.payload[1][0] = json.payload[1][0]
                .replaceAll("\"", "")
                .replaceAll("\/", "")
                .replaceAll("\\", "/");
        }
        
        switch (errorCode) {
            case 2: throw this.getCaptcha(json.payload[1][0]);
            case 4: {
                await this.request(json.payload[1][0], null, false);
                return { error: false };
            }
            case 0: case 5: case 8: throw this.get2FACode(params.hash);
            default:
                throw {
                    error: true,
                    errorObject: json.payload[1],
                    errorCode
                };
        }
    }

    async final (json, params = {}) {
        const result = await this.checkErrors(json, params);

        if (result.error) {
            throw result;
        }

        if (this.tfa) {
            delete this.tfa;
        }

        return this;
    }

    async solveCaptcha (params) {
        const response = await this.request(urls.AUTH_CHECK_CODE, {
            captcha_sid: params.captcha_sid,
            captcha_key: params.captcha_key,
            ...this.tfa
        });

        const json = this.parseJSON(response);
        return await this.final(json, params);
    }

    async auth2FA (params) {
        this.tfa = {
            al: 1,
            code: params.code,
            hash: params.hash,
            remember: 1,
            t2fs: ""
        };

        const response = await this.request(urls.AUTH_CHECK_CODE, this.tfa);
        const json = this.parseJSON(response);

        return await this.final(json, params);
    }
}

module.exports = HTTPClient;