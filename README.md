# EasyVK AudioAPI

This is an unofficial AudioAPI for [EasyVK](https://github.com/ciricc/easyvk). Works as an extension for the library. This API using in [Meridius](https://github.com/PurpleHorrorRus/Meridius) project.

# Installation

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

Recommend to use [#meridius](https://github.com/PurpleHorrorRus/EasyVK-AudioAPI/tree/meridius) branch rather than #master

# Getting Started

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

# Full example

```javascript
const easyvk = require("easyvk");
const AudioAPI = require("easyvk-audio");

const run = async () => {
    const username = "xxxxxxxxxxx";
    const password = "xxxxxxxxxxx";

    const vk =  await easyvk({ username, password });
    const client = await vk.http.loginByForm({ username, password });
    const API = new AudioAPI(client);

    const { audios: my_audios, count } = await API.audio.getAll();
    console.log(my_audios);
    console.log(`Wow, I have ${count} audio!`);
};

run();
```

# Usage

The API splitted into 5 parts: audio, playlists, search, artists, recommendations.
To use each of this you must to specify part which you would to use. Example:

```javascript
const { audios } = await API.audio.get();
const { playlists } = await API.playlists.get();
const search = await API.search.query("Queen");
const artsits = await API.artists.get("Queen");
const recoms = await API.recoms.loadExplore();
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

## Processing .m3u8 using FFmpeg

Sometimes VK returns links to .m3u8 files that cannot be converted into a direct link before .mp3. It is for such cases that you need to use FFmpeg for processing.

This method will not affect links that can be explicitly converted.

To do this, EasyVK-Audio does the following:
1. Get a link to the .m3u8 file.
2. Parse all links in the .m3u8 file.
3. Download all files from the links and decrypt them using the encryption key.
4. Using FFmpeg, it combines all files into one .mp3 file without additional compression.
5. Converts .mp3 file to Buffer object and deletes all previous files.

One such conversion takes about 3 seconds. I recommend manually caching the received buffer (to base64 or own .mp3 file) to avoid re-converting.

You just need:
1. Download FFmpeg binaries (one ffmpeg.exe is enough) from any reliable source.
2. Specify the path to ffmpeg.exe in the parameters for creating an instance of AudioAPI.

Example:
```javascript
const API = new AudioAPI(client, {
    ffmpeg: {
        path: "./ffmpeg.exe"
    }
});
```

Otherwise, if you do not use FFmpeg, then EasyVK-Audio will advise you to use it anyway. This is to provide a 100% guarantee for fetching audio links.

## Manually processing

Also you can fetch .m3u8 links manually. See example:

```javascript
const { audios } = await API.audio.get({ raw: true });
const [full] = await API.audio.parse([audio], { rawLinks: true });
const parsed = await API.m3u8.get(full.url);
```

You can add ```rawLinks: true``` params to any request.

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
| ```withMore``` | ```more``` object | Returns more results by ```more``` object |
| ```hints```| q | Return search hints |
| ```inAudios```| q<br/>owner_id<br/>count? | Returns a list of finded audios of user/community |

## Artists

| Function  | Params | Description |
| :-----    | :--:   | :------     |
| ```get```| artist | Get artist page. Returns the popular audios and playlists.<br/>artist param must be an endpoint, not full name. You can get endpoint at ```link``` field of ```search.query``` for example |

You can see how to get full list of audio or playlists of artist in jest testing file.

## Recommendations

| Function  | Params | Description |
| :-----    | :--:   | :------     |
| ```loadExplore```| - | Load full explore page |
| ```getCollections```| - | Returns the collections offering by VK |
| ```getNewAlbums```| - | Returns the new albums |
| ```getRecomsArtists```| - | Returns the daily recommendation artists |
| ```getNewReleases```| - | Returns the list of audios of new releases |
| ```getChart```| - | Returns the list of VK Chart |
| ```getOfficialPlaylists```| - | Returns the list of official collections of playlists splitted to categories |
| ```getDailyRecoms```| count? | Returns the list of daily audios |
| ```getWeeklyRecoms```| count? | Returns the list of weekly audios |

The explore and recoms sections caching and updating every hour itself for make loading faster.

# Contribution

You can feel free to open issues tickets or PR to help me with this API.

# Conclusion

You can check jest tests to check more functional or see examples.