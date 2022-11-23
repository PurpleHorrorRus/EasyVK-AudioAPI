# EasyVK AudioAPI

This is an unofficial Audio API for VK. Works as an extension for the library. This API using in [Meridius](https://github.com/PurpleHorrorRus/Meridius) project.

See [CHANGELOG.md](https://github.com/PurpleHorrorRus/EasyVK-AudioAPI/blob/meridius/CHANGELOG.md)

- [Installation](#installation)
- [Getting Started](#getting-started)
- [Handling TFA and Captcha](#handling-tfa-and-captcha)
- [Usage](#usage)
    - [Play .m3u8 files with hls.js](#play-m3u8-files-with-hlsjs)
    - [Audio](#audio)
    - [Playlists](#playlists)
    - [Search](#search)
    - [Artists](#artists)
    - [Recommendations](#recommendations)
- [Contribution](#contribution)
- [Conclusion](#conclusion)

# Installation

Install [VK-IO](https://www.npmjs.com/package/vk-io) via npm or yarn

```bash
yarn add vk-io
// or
npm install vk-io
```

Install AudioAPI package

```bash
yarn add https://github.com/PurpleHorrorRus/EasyVK-AudioAPI
// or
npm install https://github.com/PurpleHorrorRus/EasyVK-AudioAPI
```

Recommend to use [#meridius](https://github.com/PurpleHorrorRus/EasyVK-AudioAPI/tree/meridius) branch rather than #master


# Getting Started
Create an API

```javascript
const token = "xxxxxxxxxxx";
const credits = {
    username: "xxxxxxxxxxx",
    password: "xxxxxxxxxxx",
    user:     "xxxxxxxxxxx" // Your user_id
};

const AudioAPI = require("easyvk-audio");
const API = await new AudioHTTP(token, vkioParams?, params?).login(credits);
```

**You awesome!!**

# Full example

```javascript
const { VK } = require("vk-io");
const AudioAPI = require("easyvk-audio");

const token = "xxxxxxxxxxx";
const credits = {
    username: "xxxxxxxxxxx",
    password: "xxxxxxxxxxx",
    user:     "xxxxxxxxxxx" // Your user_id
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

# Handling TFA and Captcha

```javascript
const HTTPClient = require("./index");
const readline = require("readline");
require("dotenv").config();

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

    if (code === "sms") {
        // Request code via SMS
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

# Usage

The API splitted into 5 parts: audio, playlists, search, artists, recommendations.
To use each of this you must to specify part which you would to use. Example:

```javascript
const { audios } = await API.audio.get();
const { playlists } = await API.playlists.get();
const search = await API.search.query({ q: "Queen" });
const artsits = await API.artists.get("Queen");
const recommendations = await API.recoms.loadRecoms();
const explore = await API.recoms.load();
```

## Recommendation for optimizing the requests

Each URL storing separately from audio object and needs to single request (10 audios per request). This is increased time of request and flooding to vk servers. To avoid this, read below.

I highly recomends you to set in parameters of each function fetching raw audio object. This returns audio full audio objects with "raw" array, but without URL's. Then you can use audio.fetch(raw) in any time. This method allows you to reduce the request time (1300ms -> 300ms average, you can check tests manually) and avoid flooding to vk servers. Here is another example:

```javascript
const { audios } = await API.audio.get({ raw: true });
const [full] = await API.audio.parse([audio[0].raw]);

/*
    A certain scientific PlayMusicLogic(full)
*/
```

## Play .m3u8 files with hls.js

VK uses .m3u8 file formats for music. So you can use [hls.js](https://github.com/video-dev/hls.js/) package to play it.

Example:
```javascript
const Hls = require("hls.js");

const sound = new Audio();
const hls = new Hls();

const { audios } = await API.audio.get({ raw: true });
const parsed = await API.audio.parse([audio[0].raw]);

hls.attachMedia(sound);
hls.on(hlsjs.Events.MEDIA_ATTACHED, hls.loadSource(parsed[0].url));

sound.addEventListener("canplaythrough", () => sound.play());
```
## Downloading audio (Breaking Change from 1.2.0)

Also you can fetch .m3u8 links manually using ffmpeg. See example:

```javascript
import AudioAPIHLS from "easyvk-audio/lib/hls";

const { audios } = await API.audio.get();

const instance = new AudioAPIHLS(params?);

// Events
instance.once("processing", () => console.log("Start processing..."));
instance.on("progress", progress => console.log(progress));

const output = await instance.download(audios[0], ffmpegPath, outputPath);
```

Params object:

```typescript
params = {
    name: string, // name of output file (default: name of first chunk's file)
    chunksFolder: string, // folder to store downloaded chunks. Chunks deletes automatically after processing (default: "hls")
    delete: boolean, // resolve buffer and delete output file (default: false)
    concurrency: Number // number of parallel downloadings (default: 5)
};
```

### Now let's see each part.

## Audio

| Function  | Params | Description |
| :-----     | :--:   | :------ |
| ```get```       | owner_id?<br/>playlist_id?<br/>access_hash?<br/>count? | Returns the list of first %count% audios|
| ```getCount```     | owner_id?<br/>playlist_id?<br/>access_hash? | Returns a count audios of user/community |
| ```getFromWall```     | owner_id<br/>post_id<br/> | Returns the list of audios from wall post |
| ```add``` | Audio object | Add audio in "My Audios" |
| ```delete``` | Audio object | Delete audio from "My Audios" |
| ```edit``` | Audio object<br/>params | Edit the audio file if it available. In params you can to specify fields: title?: string, performer?: string, privacy?: number |
| ```reorder``` | audio_id<br/>next_audio_id<br/>owner_id? | Reorder audios in playlist |
| ```upload```| path | Upload audio file |
| ```parse```| array of audios | Fetch full audio objects (with URL, etc.) |

<br/>

## Playlists
| Function  | Params | Description |
| :-----    | :--:   | :------     |
| ```get``` | access_hash?<br/>offset?<br/>owner_id? | Returns the list of first playlists by offset |
| ```getPlaylist``` | owner_id<br/>playlist_id<br/>list?<br/>access_hash? | Return a single playlist object. Boolean list meaning parsing audios in playlist, but it takes a longer time. access_hash forces list = true automatically if you want to load third-party playlists (general page or search for example) |
| ```getById``` | owner_id<br/>playlist_id<br/>list?<br/>access_hash?<br/>count? | The same as ```getPlaylist()```, but better for getting of user/community playlists. You can to specify count in params to splice audios in list for faster loading |
| ```getCount```| owner_id? | Return the count of playlists of user/community |
| ```getByBlock```| block<br/>section? | Return playlists by block and section |
| ```getFromWall```| owner_id?<br/>playlist_id | Fetching playlist from wall |
| ```create```| title<br/>description?<br/>cover? | Create new playlist.<br/>Cover must be a path to cover file |
| ```edit```| playlist_id<br/>title?<br/>description?<br/>cover? | Edit the existing playlist |
| ```delete```| Playlist object | Delete playlist |
| ```follow```| Playlist object | Follow playlist |
| ```reorder```| playlist_id<br/>prev_playlist_id | Reorder playlists |
| ```addSong```| Audio object<br/>Playlist object | Add song to playlist |
| ```removeSong```| Audio object<br/>Playlist object | Remove song from playlist |
| ```follow```| Playlist object | Follow playlist |
| ```reorderSongs```| Audios<br/>playlist_id<br/>force? | Reorder songs in playlist.<br/>Audios: string (it must be string of full_ids, you can use join() for example, see example in unit-tests)<br/>force saving you from full cleaning of playlist if you make mistake with Audios string. If you really wish to clean playlist you must to specify force: true |

## Search

Pay your attention to ```more``` object! 

```more``` object is a object that contain information for continuing searching. You can't load more results without this object.

| Function  | Params | Description |
| :-----    | :--:   | :------     |
| ```query``` | q | Returns the artists, playlists, audios and ```more``` object by query |
| ```queryExtended``` | q<br/>params? | Extended search
| ```withMore``` | ```more``` object | Returns more results by ```more``` object |
| ```hints```| q | Return search hints |
| ```inAudios```| q<br/>owner_id<br/>count? | Returns a list of finded audios of user/community |

## Artists

| Function  | Arguments | Description |
| :-----    | :--:   | :------     |
| ```get```| artist<br/>params? | Get artist page. Returns the popular audios, playlists collections, similar artists.<br/>artist param must be an endpoint, not full name. You can get endpoint at ```link``` field of ```search.query``` for example. You can specify ```list: false``` in params to fetch artist information only |
| ```collections```| link | Parse collections inside collections page |
| ```similar``` | artist | Get similar artists |

You can see how to get full list of audio or playlists of artist in jest testing file.

## Recommendations

| Function  | Params | Description |
| :-----    | :--:   | :------     |
| ```load```| - | Load full explore page |
| ```loadRecoms``` | - | Load full recoms page |
| ```collections```| - | Returns the collections offering by VK |
| ```newAlbums```| - | Returns the new albums |
| ```artists```| - | Returns the daily recommendation artists |
| ```releases```| - | Returns the list of audios of new releases |
| ```chart ```| - | Returns the list of VK Chart |
| ```officialPlaylists```| - | Returns the list of official collections of playlists splitted to categories |
| ```daily```| count? | Returns the list of daily audios |
| ```weekly```| count? | Returns the list of weekly audios |

The explore and recoms sections caching and updating every hour itself for make loading faster.

# Contribution

You can feel free to open issues tickets or PR to help me with this API.

# Conclusion

You can check jest tests to check more functional or see examples.