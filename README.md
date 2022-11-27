## EasyVK AudioAPI

This is an unofficial Audio API for VK. This library uses in [Meridius](https://github.com/PurpleHorrorRus/Meridius) project as a core.

<hr/>

- [Installation](#installation)
- [Usage example](#usage-example)
- [Handling TFA and Captcha](#handling-tfa-and-captcha)
- [Usage](./docs/USAGE.md)
    - [Play .m3u8 files with hls.js](./docs/USAGE.md#play-m3u8-files-with-hlsjs)
    - [Audio](./docs/USAGE.md#audio)
    - [Playlists](./docs/USAGE.md#playlists)
    - [Search](./docs/USAGE.md#search)
    - [Artists](./docs/USAGE.md#artists)
    - [General](./docs/USAGE.md#general)
    - [Explore](./docs/USAGE.md#explore)
- [Downloading](./docs/DOWNLOAD.md)
    - [Params object](./docs/DOWNLOAD.md#params-object)
    - [Downloading audio](./docs/DOWNLOAD.md#downloading-audio)
    - [Downloading audio using independent instance](./docs/DOWNLOAD.md#downloading-audio-using-independent-instance)
- [Contribution](#contribution)
- [Conclusion](#conclusion)

## Installation

yarn:
```bash
yarn add https://github.com/PurpleHorrorRus/EasyVK-AudioAPI
```
npm:
```
npm install https://github.com/PurpleHorrorRus/EasyVK-AudioAPI
```

Recommend to use [#meridius](https://github.com/PurpleHorrorRus/EasyVK-AudioAPI/tree/meridius) branch rather than master


## Usage example
```javascript
const AudioAPI = require("easyvk-audio");

const token = "xxxxxxxxxxx";
const credits = {
    username: "xxxxxxxxxxx",
    password: "xxxxxxxxxxx"
};

const run = async () => {
    const API = await new AudioAPI(token).login({
        ...creidts,
        cookies: "./cookies.json"
    }).catch(e => {
        // Here you can catch 2fa or captcha
        console.error(e);
    });

    const { audios } = await API.audio.getAll();
    console.log(audios);
    console.log(`Wow, I have ${audios.length} songs!`);
};

run();
```

## Handling TFA and Captcha

```javascript
const HTTPClient = require("easyvk-audio");

const readline = require("readline");

let client = null;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const token = "xxxxxxxxxxx";
const credits = {
    username: "xxxxxxxxxxx",
    password: "xxxxxxxxxxx",
    user: 0123456789
};

const ask = question => new Promise(resolve => rl.question(question, resolve));

const handleError = async err => {
    console.log(err);
    if (err.tfa) {
        return await handleAuth(err);
    } else if (err.captcha) {
        return await handleCaptcha(err);
    }
};

const handleAuth = async err => {
    const code = await ask("Two factor code:");

    // Type "sms" to request code via SMS
    if (code === "sms") {
        const sms = await client.sms();
        return console.log(sms);
    }

    return await client.auth2FA(code, err.info)
        .catch(handleError);
};

const handleCaptcha = async () => {
    return await client.solveCaptcha(await ask("Solve captcha:")).catch(handleError);
};

const run = async () => {
    client = await new AudioAPI(token).login({
        ...credits,
        cookies: "./cookie.json"
    }).catch(handleError);
    
    if (client) {
        const response = await client.audio.get();
        console.log(response);
    }
};

run();
```

## Contribution

You can feel free to open issues tickets or PR to help me with this API.

## Conclusion

You can check jest tests to check more functional or see examples.