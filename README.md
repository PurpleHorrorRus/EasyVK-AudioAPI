# EasyVK AudioAPI

This is an unofficial AudioAPI for [EasyVK](https://github.com/ciricc/easyvk). Works as an extension for the library

# Install

1. Install [EasyVK](https://www.npmjs.com/package/easyvk) via npm or yarn

```bash
yarn add easyvk
// or
npm install easyvk
```

2. Install AudioAPI package

```bash
yarn add easyvk-audio
// or
npm install easyvk-audio
```

3. Do auth with EasyVK

```javascript
const easyvk = require("easyvk");
const vk = await easyvk({ username, password });
```

4. Do the same for HTTP Client

```javascript
const client = await vk.http.loginByForm({ username, password });
```

5. Import and enable AudioAPI

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

    const vk = await easyvk({ username, password });
    const client = await vk.http.loginByForm({ username, password });
    const audio = new AudioAPI(client);

    const { audios: my_audios, count } = await audio.get();
    console.log(my_audios);
    console.log(`Wow, I have ${count} audio!`);
};
```

# Methods

This part is locked. Please buy this DLC... Oh, nevermind. Well, you can check JEST test for more examples