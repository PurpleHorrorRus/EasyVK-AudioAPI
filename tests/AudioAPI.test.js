// eslint-disable-next-line no-unused-vars
const fs = require("fs");
const readline = require("readline");

const { VK, CallbackService } = require("vk-io");
const { DirectAuthorization } = require("@vk-io/authorization");

const path = require("path");
const AudioAPI = require("../index.js");
const httpClient = require("../lib/http");

let credits = require("../vk.json");

const timeout = 5; // mins
jest.setTimeout(timeout * 60 * 1000);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let API = null;

const callbackService = new CallbackService();
callbackService.onTwoFactor(async (payload, retry) => {
    const code = await new Promise(resolve => rl.question("Two factor code", resolve));
    await retry(code);
});

const direct = new DirectAuthorization({
    callbackService,

    scope: "all",   

    clientId: "2274003",
    clientSecret: "hHbZxrka2uZ6jB1inYsH",

    login: credits.username,
    password: credits.password
});

beforeAll(async () => {
    if (!credits.token) {
        const data = await direct.run();
        credits = {
            ...credits,
            token: data.token,
            user: data.user
        };

        fs.writeFileSync("./vk.json", JSON.stringify(credits, null, 4));
    }

    API = new AudioAPI(
        await new httpClient({
            ...new VK({ token: credits.token }),
            user: credits.user
        }).login(credits), {
            ffmpeg: {
                path: path.resolve("ffmpeg.exe")
            }
        });
});

describe("AudioAPI", () => {
    // test("Get Audios", async () => {
    //     const audios = await API.audio.get({
    //         raw: true
    //     });

    //     const next = await API.audio.get({
    //         more: audios.more,
    //         raw: true
    //     });
        
    //     expect(audios).toBeTruthy();
    //     expect(next).toBeTruthy();
    // });

    // test("Get All Audios", async () => {
    //     const audios = await API.getAll({ raw: true });
    //     expect(audios).toBeTruthy();    
    // });

    // test("Get raw audio and raw link and parse", async () => {
    //     const { audios } = await API.audio.get({
    //         count: 2,
    //         raw: true
    //     });

    //     const [full] = await API.audio.parse([audios[0].raw], { rawLinks: true });
    //     const parsed = await API.m3u8.get(full.url);

    //     expect(parsed).toBeTruthy();
    // });

    // test("Get Audios m3u8 buffer", async () => { // Лютая хрень, но работет
    //     const { audios } = await API.audio.get({
    //         count: 2,
    //         raw: true
    //     });

    //     const parsed = await API.audio.parse([audios[0].raw]);
    //     const buffer = await parsed[0].url;

    //     expect(Buffer.isBuffer(buffer)).toBe(true);
    // });

    // test("Get Raw Audios", async () => {
    //     const raw = await API.audio.get({ raw: true });
    //     expect(raw.audios).toBeTruthy();
    // });

    // test("Get Lyrics", async () => {
    //     const lyrics = await API.audio.getLyrics({
    //         full_id: "529592613_456239699",
    //         lyrics_id: 446974289
    //     });

    //     expect(lyrics).toBeTruthy();
    // });

    // test("Get Audios From Wall", async () => {
    //     const audios = await API.audio.getFromWall({ 
    //         owner_id: 529592613,
    //         post_id: 103,
    //         raw: true
    //     });

    //     const result = await API.audio.parse(audios.post.map(a => a.raw));
    //     expect(result).toBeTruthy();
    // });

    // test("Process Raw Audio Manually", async () => {
    //     const raw = await API.audio.get({ raw: true });
    //     const audio = await API.audio.parse([raw.audios[0].raw]);
    //     expect(audio).toBeTruthy();
    // });

    // test("Get More Audios", async () => {
    //     const { audios } = await API.audio.get({
    //         owner_id: -41670861,
    //         playlist_id: -1,
    //         offset: 100,
    //         count: 50,
    //         raw: true
    //     });
    //     expect(audios).toBeTruthy();
    // });

    // test("Get Playlist", async () => {
    //     const playlist = await API.playlists.getPlaylist({ 
    //         playlist_id: 5, 
    //         list: true,
    //         raw: true
    //     });

    //     expect(playlist).toBeTruthy();
    // });
    
    // let add = null;

    // test("Add song", async () => {
    //     const playlist = await API.audio.getPlaylist({ owner_id: 215185126, playlist_id: 2, list: true });
    //     add = await API.audio.add(playlist.list[0]);
    //     expect(add).toBeTruthy();
    // });

    // test("Delete song", async () => {
    //     const { audios } = await API.audio.get();
    //     const deleted = await API.audio.delete(audios[0]);
    //     expect(deleted).toBe(true);
    // });

    // test("Reorder songs", async () => {
    //     const { audios } = await API.audio.get();

    //     const audio_id = audios[1].id;
    //     const next_audio_id = audios[2].id;

    //     const reorder = await API.audio.reorder({ audio_id, next_audio_id });

    //     expect(reorder).toBe(true);
    // });
    
    // test("Edit song", async () => {
    //     const { audios } = await API.audio.get();
    //     const can_edit = audios.filter(a => a.can_edit);
    //     const song = can_edit[0];
    //     const results = await API.audio.edit(song, { performer: "Meridius", title: "Test" });
    //     expect(results).toBeTruthy();
    // });

    // test("Upload Audio", async () => {
    //     const saved = await API.audio.upload("./test.mp3");
    //     expect(saved).toBeTruthy();
    // });

    // test("Audio status", async () => {
    //     const { audios } = await API.audio.get();
    //     await API.toggleAudioStatus({
    //         enable: true,
    //         raw_audio_id: audios[0].full_id
    //     });

    //     await API.changeAudioStatus({ raw_audio_id: audios[1].full_id });
    // });

    // test("Upload Audio", async () => {
    //     const path = "PUT PATH HERE";
    //     const saved = await API.audio.uploadAudio(path);
    //     expect(saved).toBeTruthy();
    // });
});

describe("Playlists", () => {
    // test("Get Playlists", async () => {
    //     const { playlists, count } = await API.playlists.get();
    //     expect(playlists.length).toBeGreaterThanOrEqual(0);
    //     expect(count).toBeGreaterThanOrEqual(0);
    // });

    // test("Get Playlists Count", async () => {
    //     const count = await API.playlists.getCount();
    //     expect(count).toBeGreaterThan(0);
    // });

    // test("Get Playlist By Id", async () => {
    //     const result = await API.playlists.getById({ 
    //         playlist_id: 5, 
    //         list: true,
    //         raw: true
    //     });

    //     expect(result).toBeTruthy();
    // });

    // test("Get Playlists By Block", async () => {
    //     const result = await API.playlists.getByBlock({
    //         block: "new_albums",
    //         section: "explore"
    //     });

    //     expect(result).toBeTruthy();
    // });

    // test("Create playlist", async () => {
    //     const cover_path = "./pic.jpg";

    //     const result = await API.playlists.create({
    //         title: "Meridius playlist",
    //         description: "Hello from Meridius!",
    //         cover: cover_path
    //     });

    //     expect(result).toBeTruthy();
    // });

    // test("Edit", async () => {
    //     const cover_path = "PUT PATH HERE";

    //     const result = await API.playlists.edit({ 
    //         playlist_id: 35,
    //         title: "test", 
    //         description: "test123",
    //         cover: cover_path
    //     });
        
    //     expect(result).toBe(true);
    // });

    // test("Add song to playlist", async () => {
    //     const { audios } = await API.audio.get();
    //     const { playlists } = await API.playlists.get();
    //     const result = await API.playlists.addSong(audios[0], playlists[0]);
    //     expect(result).toBe(true);
    // });

    // test("Remove song from playlist", async () => {
    //     const playlist = await API.playlists.getPlaylist({
    //         playlist_id: 5,
    //         list: true
    //     });

    //     const result = await API.playlists.removeSong(playlist.list[0], playlist);
    //     expect(result).toBe(true);
    // });

    // test("Reorder Playlists", async () => {
    //     const { playlists } = await API.playlists.get();
    //     const reorderResult = await API.playlists.reorder({
    //         playlist_id: playlists[1].playlist_id,
    //         prev_playlist_id: 0
    //     });

    //     expect(reorderResult).toBe(true);
    // });

    // test("Reorder Songs in Playlist", async () => {
    //     const { audios } = await API.audio.get({ playlist_id: 35 });
    //     const reverse = audios.reverse().map(a => a.full_id).join(",");
    //     const result = await API.playlists.reorderSongs({
    //         Audios: reverse,
    //         playlist_id: 35
    //     });
    //
    //     expect(result).toBe(true);
    // });
});

describe("Search Engine", () => {
//     test("Audio Searching", async () => {
//         const results = await API.search.query({ 
//             q: "Queen",
//             raw: true
//         });
//         expect(results).toBeTruthy();
//     });

    //     test("Audio search by offset", async () => {
    //         const search = await API.search.query({ 
    //             q: "Queen",
    //             raw: true
    //         });

    //         const results = await API.audio.withMore({ 
    //             more: search.more,
    //             raw: true,
    //             normalize: true
    //         });

    //         expect(results).toBeTruthy();
    //     });

    //     test("Search Hints", async () => {
    //         const results = await API.search.hints({ q: "Que" });
    //         expect(results[0][1]).toBe("queen");
    //     });

    //     test("Search in audios", async () => {
    //         const result = await API.search.inAudios({
    //             owner_id: -41670861,
    //             q: "Twil",
    //             raw: true
    //         });
    //         expect(result).toBeTruthy();
    //     });
    // });

    // describe("Artists", () => {
    //     test("Get Artist", async () => {
    //         const result = await API.artists.get({ 
    //             artist: "Queen",
    //             raw: true
    //         });
    //         expect(result).toBeTruthy();
    //     });

    //     test("Get Artist Top Songs", async () => {
    //         const result = await API.search.more("artist/queen/top_audios", { 
    //             raw: true
    //         });
    //         expect(result).toBeTruthy();
    //     });
    
    //     test("Get More Artist Top Songs", async () => {
    //         let result = await API.search.more("artist/queen/top_audios", { raw: true });

    //         result = await API.search.more("artist/queen/top_audios", {
    //             start_from: result.start_from,
    //             raw: true
    //         });

    //         expect(result).toBeTruthy();
    //     });

    //     test("Get Artist Playlists", async () => {
    //         const result = await API.search.morePlaylists("artist/queen/albums");
    //         expect(result).toBeTruthy();
    //     });
 
    //     test("Get More Artist Playlists", async () => {
    //         let result = await API.search.morePlaylists("artist/queen/albums");

    //         result = await API.search.morePlaylists("artist/queen/albums", { 
    //             start_from: result.start_from 
    //         });

    //         expect(result).toBeTruthy();
    //     });
    // });

    // describe("Recoms", () => {
    //     test("Get Collections", async () => {
    //         const results = await API.recoms.getCollections({
    //             raw: true
    //         });
        
    //         expect(results).toBeTruthy();
    //     });

    //     test("Get New Albums", async () => {
    //         const results = await API.recoms.getNewAlbums({
    //             raw: true
    //         });
        
    //         expect(results).toBeTruthy(); 
    //     });

    //     test("Load Explore", async () => {
    //         const results = await API.recoms.loadExplore({ 
    //             count: 6, 
    //             raw: true 
    //         });

    //         expect(results).toBeTruthy();
    //     });

    // test("Get Recoms Artists", async () => {
    //     const results = await API.recoms.getRecomsArtsits({
    //         raw: true
    //     });
        
    //     expect(results).toBeTruthy();

    //     const full = await API.recoms.getAllRecomsArtsits(results.type);
    //     expect(full).toBeTruthy();
    // });

    //     test("Get Daily Recoms", async () => {
    //         const results = await API.recoms.getDailyRecoms({
    //             raw: true
    //         });

    //         expect(results).toBeTruthy();
    //     });

    //     test("Get Weekly Recoms", async () => {
    //         const results = await API.recoms.getWeeklyRecoms({
    //             raw: true
    //         });

    //         expect(results).toBeTruthy();
    //     });

    //     test("Get New Songs", async () => {
    //         const results = await API.search.getByBlock({ 
    //             block: "new_songs",
    //             section: "explore",
    //             raw: true
    //         });

    //         expect(results).toBeTruthy();
    //     });

    //     test("Load By Block", async () => {
    //         const results = await API.playlists.getByBlock({ 
    //             block: "rap",
    //             section: "explore",
    //             raw: true
    //         });
        
    //         expect(results).toBeTruthy();
    //     });

    //     test("Friend Updates", async () => {
    //         const results = await API.getFriendsUpdates({
    //             raw: true
    //         });

//         expect(results).toBeTruthy();
//     });
});