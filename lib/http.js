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
        IP_H: /ip_h: \'(.*?)\'/,
        LG_H: /lg_h" value="(.*?)"/,
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
        response.headers.raw()["set-cookie"]
            .map(cookie => configuration.jar.setCookieSync(Cookie.parse(cookie), response.url));
        
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

    async refreshSession () {
        let response = await this.request(urls.GENERAL, {}, false);
        let body = await response.text();

        if (regex.ACTION_LOGIN.test(body)) {
            response = await this.request("https://vk.com/feed");
            body = await response.text();
        }
        
        return body;
    }

    async login (params = {}) {
        configuration.jar = new CookieJar(new FileCookieStore(params.cookies || configuration.cookiesPath));

        setInterval(() => this.refreshSession(), 60 * 1000);
        const body = await this.refreshSession();
        if (!regex.ACTION_LOGIN.test(body)) {
            return this;
        }

        if (!params.username || !params.password) {
            throw new Error("Need auth by login and password");
        }
        
        return await this.actLogin({
            ip_h: body.match(regex.LOGIN.IP_H)[1],
            lg_h: body.match(regex.LOGIN.LG_H)[1],
            lg_domain_h: body.match(regex.LOGIN.LG_DOMAIN_H)[1],
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

        let body = await response.textConverted();

        if (regex.SERVICE_ERROR.test(body)) {
            throw {
                error: true,
                message: body.match(regex.SERVICE_ERROR_TEXT)[2],
                service: true
            };
        }

        if (regex.ACT_AUTHCHECK.test(body)) {
            response = await this.request(urls.AUTH_CHECK, {}, false);
            body = this.clearResponse(await response.text());

            const [, hash] = body.match(regex.LOGIN.TFA_HASH);
            throw this.get2FACode(hash);
        }

        return this;
    }

    async checkErrors (json, params = {}) {
        const errorCode = Number(json.payload[0]);
        switch (errorCode) {
            case 2: throw this.getCaptcha(this.clearResponse(json.payload[1][0]).replaceAll("\"", ""));
            case 4: return { error: false };
            case 0: case 5: case 8: throw this.get2FACode(params.hash);
            default: 
                return { 
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

        const body = await response.text();
        const json = this.parseJSON(body);

        return await this.final(json, params);
    }

    async auth2FA (params) {
        this.tfa = {
            al: 1,
            code: params.code,
            hash: params.hash,
            remember: 1
        };

        const response = await this.request(urls.AUTH_CHECK_CODE, this.tfa);
        const body = await response.textConverted();
        const json = this.parseJSON(body);

        return this.final(json, params);
    }
}

module.exports = HTTPClient;