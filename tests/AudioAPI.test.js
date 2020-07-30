const easyvk = require("easyvk");
const fs = require("fs");
const AudioAPI = require("../index.js");

const ReadJSON = dir => JSON.parse(fs.readFileSync(dir, "UTF-8"));

const timeout = 5; // mins
jest.setTimeout(timeout * 60 * 1000);

let vk = null;
let client = null;
// eslint-disable-next-line no-unused-vars
let audio = null;

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
    audio = new AudioAPI(client);
});

describe("auth", () => {
    test("vk", () => expect(vk).toBeTruthy());
    test("http", () => expect(client).toBeTruthy());
});

describe("AudioAPI", () => {
    // test("Get Audios", async () => {
    //     const audios = await audio.get();
    //     expect(audios).toBeTruthy();
    // });

    // test("Get More Audios", async () => {
    //     const { audios } = await audio.get({
    //         owner_id: -41670861,
    //         playlist_id: -1,
    //         offset: 100,
    //         count: 50
    //     });
    //     expect(audios).toBeTruthy();
    // });

    // test("Get Count", async () => {
    //     const results = await audio.getCount();
    //     expect(results).toBeTruthy();
    // });

    // test("Get Playlist", async () => {
    //     const playlist = await audio.getPlaylist({ playlist_id: 5, list: true });
    //     expect(playlist).toBeTruthy();
    // });
    
    // let add = null;

    // test("Add song", async () => {
    //     const playlist = await audio.getPlaylist({ owner_id: 215185126, playlist_id: 2, list: true });
    //     add = await audio.add(playlist.list[0]);
    //     expect(add).toBeTruthy();
    // });

    // test("Delete song", async () => {
    //     const { audios } = await audio.get();
    //     const deleted = await audio.delete(audios[0]);
    //     expect(deleted).toBe(true);
    // });

    // test("Reorder songs", async () => {
    //     const { audios } = await audio.get();

    //     const audio_id = audios[1].id;
    //     const next_audio_id = audios[2].id;

    //     const reorder = await audio.reorder({ audio_id, next_audio_id });

    //     expect(reorder).toBe(true);
    // });
    
    // test("Edit song", async () => {
    //     const { audios } = await audio.get();
    //     const can_edit = audios.filter(a => a.can_edit);
    //     const song = can_edit[0];
    //     const results = await audio.edit(song, { performer: "Meridius", title: "Test" });
    //     expect(results).toBeTruthy();
    // });

    // test("Audio status", async () => {
    //     const { audios } = await audio.get();
    //     await audio.toggleAudioStatus({
    //         enable: true,
    //         raw_audio_id: audios[0].full_id
    //     });

    //     await audio.changeAudioStatus({ raw_audio_id: audios[1].full_id });
    // });

    // test("Upload Audio", async () => {
    //     const path = "PUT PATH HERE";
    //     const saved = await audio.uploadAudio(path);
    //     expect(saved).toBeTruthy();
    // });
});

describe("Playlists", () => {
    // test("Get Playlists", async () => {
    //     const { playlists, count } = await audio.getPlaylists();
    //     expect(playlists.length).toBeGreaterThanOrEqual(0);
    //     expect(count).toBeGreaterThanOrEqual(0);
    // });

    // test("Get Playlists Count", async () => {
    //     const count = await audio.getPlaylistsCount({ owner_id: -40520174 });
    //     expect(count).toBeGreaterThan(0);
    // });

    // test("Get Playlist By Id", async () => {
    //     const result = await audio.getPlaylistById({ playlist_id: 35, list: true });
    //     expect(result).toBeTruthy();
    // });

    // test("Get Playlists By Type", async () => {
    //     const type = "";

    //     const result = await audio.getPlaylistsByType({ type });
    //     expect(result).toBeTruthy();
    // });

    // test("Create playlist", async () => {
    //     const cover_path = "PUT PATH HERE";

    //     const result = await audio.createPlaylist({
    //         title: "Meridius playlist",
    //         description: "Hello from Meridius!",
    //         cover: cover_path
    //     });

    //     expect(result).toBeTruthy();
    // });

    // test("Edit", async () => {
    //     const cover_path = "PUT PATH HERE";

    //     const result = await audio.editPlaylist({ 
    //         playlist_id: 35,
    //         title: "test", 
    //         description: "test123",
    //         cover: cover_path
    //     });
    //     expect(result).toBe(true);
    // });

    // test("Add song to playlist", async () => {
    //     const { audios } = await audio.get();
    //     const playlists = await audio.getPlaylists();
    //     const result = await audio.addToPlaylist(audios[0], playlists[0]);
    //     expect(result).toBe(true);
    // });

    // test("Remove song from playlist", async () => {
    //     const { audios } = await audio.get({ playlist_id: 35 });
    //     const playlists = await audio.getPlaylists();
    //     const result = await audio.removeFromPlaylist(audios[0], playlists[0]);
    //     expect(result).toBe(true);
    // });

    // test("Reorder songs", async () => {
    //     const { audios } = await audio.get({ playlist_id: 35 });
    //     const reverse = audios.reverse().map(a => a.full_id).join(",");
    //     const result = await audio.reorderSongsInPlaylist({
    //         Audios: reverse,
    //         playlist_id: 35
    //     });
    //     expect(result).toBe(true);
    // });
});

describe("Search Engine", () => {
    // test("Audio search", async () => {
    //     const results = await audio.search({ q: "Painful History" });
    //     expect(results).toBeTruthy();
    // });

    // test("Audio search by offset", async () => {
    //     const search = await audio.search({ q: "Queen" });
    //     const results = await audio.searchWithMore({ search });
    //     expect(results).toBeTruthy();
    // });

    // test("Search Hints", async () => {
    //     const results = await audio.searchHints("Que");
    //     expect(results[0][1]).toBe("queen");
    // });

    // test("Search in audios", async () => {
    //     const result = await audio.searchInAudios({
    //         owner_id: -41670861,
    //         q: "Twil"
    //     });
    //     expect(result).toBeTruthy();
    // });

    // test("Get Artist", async () => {
    //      const result = await audio.getArtist("Queen");
    //      expect(result).toBeTruthy();
    // });

    // test("Get Artist Top Songs", async () => {
    //     const result = await audio.searchMore("/artist/queen/top_audios", { offset: 0, cursor: "" });
    //     expect(result).toBeTruthy();
    // });

    // test("Get Artist Playlists", async () => {
    //     const result = await audio.searchMorePlaylists("/artist/queen/albums", { offset: 0, cursor: "" });
    //     expect(result).toBeTruthy();
    // });
});

describe("Recoms", () => {
    // test("Get Collections", async () => {
    //     const results = await audio.getCollections();
    //     expect(results).toBeTruthy();
    // });

    // test("Load Explore", async () => {
    //     const results = await audio.loadExplore({ count: 6 });
    //     expect(results).toBeTruthy();
    // });

    // test("Get Recoms Artists", async () => {
    //     const results = await audio.getRecomsArtsits();
    //     expect(results).toBeTruthy();
    // });

    // test("Get Daily Recoms", async () => {
    //     const results = await audio.getDailyRecoms();
    //     expect(results).toBeTruthy();
    // });

    // test("Get Weekly Recoms", async () => {
    //     const results = await audio.getWeeklyRecoms();
    //     expect(results).toBeTruthy();
    // });

    // test("Get New Songs", async () => {
    //     const results = await audio.getSongsByBlock({ block: "new_songs" });
    //     expect(results).toBeTruthy();
    // });

    // test("Load By Block", async () => {
    //     const results = await audio.getPlaylistsByBlock({ 
    //         block: "rap",
    //         section: "explore"
    //     });
    //     expect(results).toBeTruthy();
    // });

    // test("Friend Updates", async () => {
    //     const results = await audio.getFriendsNew();
    //     expect(results).toBeTruthy();
    // });
});