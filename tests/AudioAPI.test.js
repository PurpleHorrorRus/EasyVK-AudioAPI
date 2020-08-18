const easyvk = require("easyvk");
const fs = require("fs");
const AudioAPI = require("../index.js");

const ReadJSON = dir => JSON.parse(fs.readFileSync(dir, "UTF-8"));

const timeout = 5; // mins
jest.setTimeout(timeout * 60 * 1000);

let vk = null;
let client = null;
// eslint-disable-next-line no-unused-vars
let API = null;

beforeAll(async () => {
    const { username, password } = ReadJSON("vk.json");
    vk = await easyvk({
        username,
        password,
        save: true,
        sessionFile: "./.vksession"
    });
    
    client = await vk.http.loginByForm({
        username,
        password,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:74.0) Gecko/20100101 Firefox/78.0",
        cookies: "./cookies.json" 
    });

    API = new AudioAPI(client);
});

describe("auth", () => {
    test("vk", () => expect(vk).toBeTruthy());
    test("http", () => expect(client).toBeTruthy());
});

describe("AudioAPI", () => {
    // test("Get Audios", async () => {
    //     const audios = await API.audio.get();
    //     expect(audios).toBeTruthy();
    // });

    // test("Get Raw Audios", async () => {
    //     const raw = await API.audio.get({ raw: true });
    //     expect(raw.audios).toBeTruthy();
    // });

    // test("Process Raw Audio Manually", async () => {
    //     const raw = await API.audio.get({ raw: true });
    //     const audio = await API.audio.parse([raw.audios[0].raw]);
    //     expect(audio).toBeTruthy();
    // });

    // test("Get With More", async () => {
    /*
        DO NOT USE THIS IF FUNCTION get() IS WORKING. THIS IS A KIND OF "BIG RED BUTTON"
    */
    //     const audios = await API.audio.getWithMore({ raw: true });
    //     expect(audios).toBeTruthy();
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

    // test("Get Count", async () => {
    //     const results = await API.audio.getCount();
    //     expect(results).toBeTruthy();
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

    // test("Audio status", async () => {
    //     const { audios } = await API.audio.get();
    //     await API.audio.toggleAudioStatus({
    //         enable: true,
    //         raw_audio_id: audios[0].full_id
    //     });

    //     await API.audio.changeAudioStatus({ raw_audio_id: audios[1].full_id });
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
    //     const cover_path = "PUT PATH HERE";

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

    // test("Reorder Songs in Playlist", async () => {
    //     const { audios } = await API.audio.get({ playlist_id: 35 });
    //     const reverse = audios.reverse().map(a => a.full_id).join(",");
    //     const result = await API.playlists.reorderSongs({
    //         Audios: reverse,
    //         playlist_id: 35
    //     });
    //     expect(result).toBe(true);
    // });
});

describe("Search Engine", () => {
    // test("Audio Searching", async () => {
    //     const results = await API.search.query({ 
    //         q: "Queen",
    //         raw: true
    //     });
    //     expect(results).toBeTruthy();
    // });

    // test("Audio search by offset", async () => {
    //     const search = await API.search.query({ 
    //         q: "Queen",
    //         raw: true
    //     });
    //     const results = await API.search.withMore({ more: search.more });
    //     expect(results).toBeTruthy();
    // });

    // test("Search Hints", async () => {
    //     const results = await API.search.hints({ q: "Que" });
    //     expect(results[0][1]).toBe("queen");
    // });

    // test("Search in audios", async () => {
    //     const result = await API.search.inAudios({
    //         owner_id: -41670861,
    //         q: "Twil",
    //         raw: true
    //     });
    //     expect(result).toBeTruthy();
    // });
});

describe("Artists", () => {
    // test("Get Artist", async () => {
    //     const result = await API.artists.get({ 
    //         artist: "Queen",
    //         raw: true
    //     });
    //     expect(result).toBeTruthy();
    // });

    test("Get Artist Top Songs", async () => {
        const result = await API.search.more("artist/queen/top_audios", { 
            offset: 0, 
            next_from: "",
            raw: true
        });
        expect(result).toBeTruthy();
    });
 
    test("Get Artist Playlists", async () => {
        const result = await API.search.morePlaylists("artist/queen/albums", { 
            offset: 0, 
            next_from: "" 
        });
        expect(result).toBeTruthy();
    });
});

describe("Recoms", () => {
    // test("Get Collections", async () => {
    //     const results = await API.recoms.getCollections();
    //     expect(results).toBeTruthy();
    // });

    // test("Load Explore", async () => {
    //     const results = await API.recoms.loadExplore({ count: 6 });
    //     expect(results).toBeTruthy();
    // });

    // test("Get Recoms Artists", async () => {
    //     const results = await API.recoms.getRecomsArtsits();
    //     expect(results).toBeTruthy();
    // });

    // test("Get Daily Recoms", async () => {
    //     const results = await API.recoms.getDailyRecoms();
    //     expect(results).toBeTruthy();
    // });

    // test("Get Weekly Recoms", async () => {
    //     const results = await API.recoms.getWeeklyRecoms();
    //     expect(results).toBeTruthy();
    // });

    // test("Get New Songs", async () => {
    //     const results = await API.search.getByBlock({ 
    //         block: "new_songs",
    //         section: "explore"
    //     });
    //     expect(results).toBeTruthy();
    // });

    // test("Load By Block", async () => {
    //     const results = await API.playlists.getByBlock({ 
    //         block: "rap",
    //         section: "explore"
    //     });
    //     expect(results).toBeTruthy();
    // });

    // test("Friend Updates", async () => {
    //     const results = await API.getFriendsUpdates();
    //     expect(results).toBeTruthy();
    // });
});