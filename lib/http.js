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
        "User-Agent": "VKAndroidApp/6.2-5112 (Android 6.0; SDK 23; arm64-v8a; alps Razar; ru; 1280x720)",
        "content-type": "application/x-www-form-urlencoded",
        cookie: ""
    }
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
        const response = await this.request(`https://${isMobile ? "m." : ""}vk.com/${file}`, form, post, isMobile);
        const body = await response.text();

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

    async login(params = {}) {
        if (!params.username || !params.password) {
            throw new Error("Need auth by login and password");
        }

        const cookiesPath = params.cookies !== undefined ? params.cookies : configuration.cookiesPath;
        configuration.jar = new CookieJar(
            new CookieStore(cookiesPath)
        );

        const response = await this.request("https://vk.com/", null, false, false);
        const body = await response.text();

        const [, PostLoginURL] = body.match(/action="(.*?)"/);

        return /^https?:\/\//i.test(PostLoginURL) ?
            await this.actLogin(PostLoginURL, params) :
            this;
    }

    async actLogin(PostLoginURL, params) {
        if (!params.code) {
            const response = await this.request(PostLoginURL, {
                email: params.username,
                pass: params.password,
                captcha_sid: params.captcha_sid,
                captcha_key: params.captcha_key
            }, true, params.captcha_sid && params.captcha_key);

            const body = await response.text();
            if (body.match(/service_msg service_msg_warning/g)) {
                const err = new Error("Invalid login or password");
                err.invalidCredits = true;
                throw err;
            }

            if (body.match(/\/captcha.php([^"]+)/)) {
                const err = new Error("Captcha error");
                let captchaUrl = body.match(/\/captcha.php([^"]+)/);
                captchaUrl = `https://vk.com${captchaUrl[0]}`;

                if (captchaUrl) {
                    const captchaSid = captchaUrl.match(/sid=([0-9]+)/);

                    err.PostLoginURL = PostLoginURL;
                    err.captcha = true;
                    err.captchaUrl = captchaUrl;
                    err.captchaSid = Number(captchaSid[1]);
                    err.params = params;

                    throw err;
                }
            }

            if (body.match(/authcheck_code/)) {
                const err = new Error("You need to input two factor code");
                let checkCodeURL = body.match(/action([\s]+)?=([\s]+)?("|')(\/login\?act=authcheck_code([^"']+))/);
                checkCodeURL = checkCodeURL ? checkCodeURL[4] : null;

                err.tfa = true;
                err.checkCodeURL = `https://m.vk.com${checkCodeURL}`;

                throw err;
            }
        } else {
            const response = await this.request(params.checkCodeURL, {
                _ajax: 1,
                code: params.code,
                remember: 1
            });

            const body = await response.text();
            if (body.match(/authcheck_code/)) {
                const err = new Error("Wrong code");
                err.tfa = true;
                err.wrong = true;
                err.checkCodeURL = params.checkCodeURL;

                throw err;
            }

            return body;
        }

        await this.requestEndpoint({}, false, true, "fv?to=/mail?_fm=mail&_fm2=1");
        return this;
    }
}

module.exports = HTTPClient;