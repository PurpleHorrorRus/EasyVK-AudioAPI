# EasyVK AudioAPI

This is an unofficial AudioAPI for [EasyVK](https://github.com/ciricc/easyvk). Works as an extension for the library

## Install

Install [EasyVK](https://www.npmjs.com/package/easyvk) via npm or yarn

```bash
yarn add easyvk
// or
npm install easyvk
```

Install AudioAPI package

```bash
yarn add https://github.com/PurpleHorrorRus/EasyVK-AudioAPI
// or
npm install https://github.com/PurpleHorrorRus/EasyVK-AudioAPI
```

Recommend to use [#experimental](https://github.com/PurpleHorrorRus/EasyVK-AudioAPI/tree/experimental) branch rather than #master

Do auth with EasyVK

```javascript
const easyvk = require("easyvk");
const vk = await easyvk({ username, password });
```

Do the same for HTTP Client

```javascript
const client = await vk.http.loginByForm({ username, password });
```

Import and enable AudioAPI

```javascript
const AudioAPI = require("easyvk-audio");
const audio = new AudioAPI(client);
```

**You awesome!!**

## Full example

```javascript
const easyvk = require("easyvk");
const AudioAPI = require("easyvk-audio");

const run = async () => {
    const username = "xxxxxxxxxxx";
    const password = "xxxxxxxxxxx";

    const vk =  await easyvk({ username, password });
    const client = await vk.http.loginByForm({ username, password });
    const audio = new AudioAPI(client);

    const { audios: my_audios, count } = await audio.get();
    console.log(my_audios);
    console.log(`Wow, I have ${count} audio!`);
};

run();
```

## Methods

This part is locked. Please buy this DLC... Oh, nevermind. Well, you can check JEST test for more examples