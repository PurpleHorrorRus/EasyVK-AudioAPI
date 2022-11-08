/*
    The idea and original code - https://github.com/ciricc
*/

const fetch = require("node-fetch-retry");
const path = require("path");
const { machineIdSync } = require("node-machine-id");
const { v4 } = require("uuid");

const https = require("https");

const { CookieJar, Cookie } = require("tough-cookie");
const FileCookieStore = require("tough-cookie-file-store").FileCookieStore;

const globalConfig = require("./configuration.json");

const configuration = {
    apiVersion: "5.189",

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
        "Content-Type": "application/x-www-form-urlencoded"
    },

    verifyEndpoint: "https://id.vk.com"
};

const regex = {
    ACTION_LOGIN: /vkconnect_auth/,
    LOGIN_INIT: /window\.init = (.*?);/
};

const redirectCodes = [301, 302, 303, 307];

class HTTPClient {
    constructor () {
        this.tfa = {};
        this.captcha = {};

        this.device_id = machineIdSync({ original: true });
    }

    async request (url, form = {}, post = true, options = {}) {
        const requestOptions = {
            method: post ? "POST" : "GET",
            body: post ? new URLSearchParams(form) : undefined,
            agent: configuration.agent,
            headers: {
                ...configuration.headers,
                ...(options.additionalHeaders || {}),
                "User-Agent": options.userAgent || globalConfig.headers["User-Agent"],
                Cookie: configuration.jar.getCookieStringSync(url)
            },
            cache: "no-store",
            redirect: "manual",
            retry: Infinity,
            pause: 1000,
            ...options
        };

        const response = await fetch(url, requestOptions);

        if (!options.skipCookies) {
            response.headers.raw()["set-cookie"]?.map(cookie => {
                const parsed = Cookie.parse(cookie);
                return parsed && configuration.jar.setCookieSync(parsed, response.url);
            });
        }

        if (redirectCodes.includes(response.status)) {
            const location = response.headers.get("location");

            if (options.additionalHeaders) {
                options.additionalHeaders.Host = new URL(location).host;
            }

            return await this.request(
                location,
                response.status === 307 ? requestOptions.body : null,
                response.status === 307,
                options
            );
        }

        if (options.parse) {
            return await response.json();
        }

        return await response.textConverted();
    }

    async requestEndpoint (form = {}, post = true, isMobile = false, file = "al_audio.php", options = {}) {
        if (isMobile && file === "al_audio.php") {
            file = "audio.php";
        }

        const url = ["https://", isMobile ? "m." : "", "vk.com/", file].join("");
        const response = await this.request(url, form, post, options);
        return this.parseJSON(response);
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

    getCaptcha (captcha, message) {
        this.captcha.captcha_sid = captcha.captcha_sid;

        return {
            error: true,
            message,
            captcha: true,
            src: captcha.captcha_img
        };
    }

    get2FACode (info, message) {
        this.tfa = {
            remember_hash: info.remember_hash
        };

        this.sid_2fa = info.sid;

        return {
            error: true,
            message,
            tfa: true
        };
    }

    async login (params = {}) {
        if (params.cookies) {
            configuration.cookiesPath = params.cookies;
        }

        const cookieStore = new FileCookieStore(configuration.cookiesPath);
        configuration.jar = new CookieJar(cookieStore);

        const response = await this.request(configuration.verifyEndpoint);
        if (!regex.ACTION_LOGIN.test(response)) {
            return await this.final();
        }

        if (!params.username || !params.password) {
            throw new Error("Need auth by login and password");
        }

        this.credits = {
            username: params.username,
            password: params.password
        };

        const matchInit = response.match(regex.LOGIN_INIT)[1];
        this.init = JSON.parse(matchInit);
        this.init.v = configuration.apiVersion;
        this.init.uuid = v4();
        this.init.headers = {
            Origin: "https://id.vk.com",
            Referer: "https://id.vk.com/"
        };

        return await this.actLogin();
    }

    async actLogin () {
        const authResponse = await this.request("https://login.vk.com/?act=connect_authorize", {
            ...this.credits,
            auth_token: this.init.auth.access_token,
            sid: "",
            uuid: this.init.uuid,
            v: this.init.v,
            device_id: this.device_id,
            service_group: "",
            expire: "",
            version: 1,
            app_id: this.init.auth.host_app_id,
            access_token: this.init.auth.access_token,
            ...this.tfa,
            ...this.captcha
        }, true, {
            additionalHeaders: this.init.headers,
            parse: true
        });

        switch (authResponse.type) {
            case "error": {
                switch (authResponse.error_code) {
                    case "code_invalid": case "incorrect_code": {
                        throw this.get2FACode(this.tfa, authResponse.error_info);
                    }

                    default: throw new Error(authResponse.error_info);
                }
            }

            case "okay": {
                if (authResponse.data.response_type === "need_2fa") {
                    throw this.get2FACode(authResponse.data.validate_info, "You need to pass 2fa code");
                }

                break;
            }

            case "captcha": {
                throw this.getCaptcha(authResponse, "You need to solve captcha");
            }
        }

        return await this.final();
    }

    async solveCaptcha (solution) {
        this.captcha.captcha_key = solution;
        return await this.actLogin();
    }

    async auth2FA (code) {
        this.tfa.code_2fa = code;
        return await this.actLogin();
    }

    async final() {
        await this.request("https://vk.com/feed", {}, false, {
            additionalHeaders: {
                Referer: "https://id.vk.com/"
            }
        });

        return this;
    }

    async sms (lang = "ru") {
        return await this.request("https://api.vk.com/method/auth.validatePhone", {
            v: this.init.v,
            client_id: this.init.auth.host_app_id,
            device_id: this.device_id,
            external_device_id: "",
            service_group: "",
            lang,
            phone: this.credits.username,
            auth_token: this.init.auth.access_token,
            sid: this.sid_2fa,
            allow_callreset: 1,
            access_token: ""
        }, true);
    }
}

module.exports = HTTPClient;