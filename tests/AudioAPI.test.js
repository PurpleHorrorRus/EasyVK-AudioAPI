// eslint-disable-next-line no-unused-vars
const fs = require("fs");
const readline = require("readline");
const path = require("path");

const { CallbackService } = require("vk-io");
const { DirectAuthorization } = require("@vk-io/authorization");

const AudioAPI = require("../index.js");
const AudioAPIHLS = require("../lib/hls");

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

    API = await new AudioAPI(credits.token)
        .login(credits, { cookies: "./cookie.json" });;
});

describe("AudioAPI", () => {
    test("Get Audios", async () => {
        const response = await API.audio.get({
            owner_id: credits.user,
            playlist_id: -1
        });

        expect(response.items.length).toBeGreaterThan(0);
    });

    test("Get All Audios", async () => {
        const audios = await API.audio.getAll({
            owner_id: credits.user
        });

        expect(audios).toBeTruthy();    
    });

    test.skip("Download Audio (Buffer)", async () => {
        const { items } = await API.audio.get({
            owner_id: credits.user,
            count: 1 
        });

        API.hls.once("processing", () => console.log("Start processing file using ffmpeg..."));
        API.hls.on("progress", answer => console.log(answer));

        const buffer = await API.hls.download(
            items[0].url, 
            path.resolve("ffmpeg.exe"), 
            path.resolve("hls", "result"),
            { chunksFolder: path.resolve("hls") }
        );

        expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    test.skip("Download Audio (Output Path)", async () => {
        const { items } = await API.audio.get({
            owner_id: credits.user,
            count: 1 
        });

        const instance = new AudioAPIHLS({ 
            ffmpegPath: path.resolve("ffmpeg.exe"),
            name: `${items[0].performer} - ${items[0].title}`,
            chunksFolder: path.resolve("hls"),
            delete: false
        });

        instance.once("processing", () => console.log("Start processing file using ffmpeg..."));
        instance.on("progress", answer => console.log(answer));

        const output = await instance.download(
            items[0].url, 
            path.resolve("hls", "result")
        );

        expect(output).toBeTruthy();
    });

    test("Get Related", async () => {
        const { items } = await API.audio.get({
            owner_id: credits.user,
            count: 1 
        });

        const result = await API.audio.recommendations({
            target_audio: `${items[0].owner_id}_${items[0].id}`
        });

        expect(result.count).toBe(100);
    });

    test("Get Lyrics", async () => {
        const lyrics = await API.audio.getLyrics(446974289);
        expect(lyrics).toBeTruthy();
    });

    let add = null;

    test.skip("Add song", async () => {
        const response = await API.audio.get({ 
            owner_id: 215185126, 
            playlist_id: 2,
            count: 1
        });

        add = await API.audio.add(response.items[0]);
        expect(add).toBeTruthy();
    });

    test.skip("Delete song", async () => {
        const response = await API.audio.get({
            owner_id: credits.user,
            count: 1
        });

        const deleted = await API.audio.delete(response.items[0]);
        expect(deleted).toBe(1);
    });

    test.skip("Edit song", async () => {
        const response = await API.audio.get({
            owner_id: credits.user,
            count: 1
        });

        const edited = await API.audio.edit(response.items[0], {
            artist: response.items[0].artist,
            title: response.items[0].title,
            genre: 0
        });

        expect(edited).toBe(1);
    });

    test.skip("Reorder songs", async () => {
        const response = await API.audio.get({
            owner_id: credits.user,
            count: 3
        });

        const reordered = await API.audio.reorder({
            owner_id: credits.user,
            audio_id: response.items[0].id,
            after: response.items[2].id
        });

        expect(reordered).toBe(1);
    });

    test.skip("Upload Audio", async () => {
        const saved = await API.audio.upload("./test.mp3");
        expect(saved).toBeTruthy();
    });

    test.skip("Audio status", async () => {
        const response = await API.audio.get({
            owner_id: credits.user,
            count: 3
        });

        const targets = [credits.user];
        const toggleTargets = await API.audio.toggleStatus(response.items[0], targets);
        expect(toggleTargets.length).toBe(targets.length);
    });
});

describe("Playlists", () => {
    test("Get Playlists", async () => {
        const response = await API.playlists.get({
            owner_id: credits.user,
            count: 20
        });

        expect(response.items.length).toBeGreaterThanOrEqual(0);
    });

    test.skip("Get Playlist By Id", async () => {
        const result = await API.playlists.getPlaylist({
            owner_id: -2000920034,
            playlist_id: 15920034,
            list: false,
            count: 5
        });

        expect(result).toBeTruthy();
    });

    test.skip("Create playlist", async () => {
        const cover_path = "./pic.jpg";

        const result = await API.playlists.create({
            title: "Meridius playlist",
            description: "Hello from Meridius!",
            cover: cover_path
        });

        expect(result).toBeTruthy();
    });

    test.skip("Delete Playlist", async () => {
        const { items } = await API.playlists.get();
        const deleted = await API.playlists.delete(items[0]);
        expect(deleted).toBe(1);
    });

    test.skip("Edit", async () => {
        const cover_path = "IMAGE PATH";

        const result = await API.playlists.edit({ 
            playlist_id: 127,
            title: "test", 
            description: "test123",
            cover: cover_path
        });

        expect(result).toBe(true);
    });

    test.skip("Add song to playlist", async () => {
        const { items } = await API.audio.get();
        let { items: playlists } = await API.playlists.get();
        playlists = playlists.filter(playlist => {
            return !playlist.original && playlist.owner_id === credits.user;
        });

        const result = await API.playlists.addSong(items[0], playlists[0]);
        expect(result.length).toBe(1);
    });

    test.skip("Remove song from playlist", async () => {
        const playlist = await API.playlists.getPlaylist({
            playlist_id: 5,
            list: true
        });

        const result = await API.playlists.removeSong(playlist.list[0], playlist);
        expect(result).toBe(1);
    });

    test.skip("Follow Playlist", async () => {
        const response = await API.playlists.follow({
            owner_id: 265076923,
            id: 103
        });

        expect(response.owner_id).toBe(credits.user);
    });

    test.skip("Reorder Playlists", async () => {
        const response = await API.playlists.get();
        const reordered = await API.playlists.reorder({
            playlist_id: response.items[1].id,
            before: response.items[0].id
        });

        expect(reordered).toBe(1);
    });

    test.skip("Reorder Songs in Playlist", async () => {
        const playlist = await API.playlists.getPlaylist({
            playlist_id: 97,
            list: true
        });

        const reordered = await API.audio.reorder({
            playlist_id: playlist.playlist_id,
            audio_id: playlist.list[0].id,
            after: playlist.list[2].id
        });
        
        expect(reordered).toBe(1);
    });
});

describe("Search Engine", () => {
    test("Audio Search", async () => {
        const search = await API.search.query("Queen");
        expect(search).toBeTruthy();
    });

    test("Search Hints", async () => {
        const results = await API.search.hints("Que");
        expect(results[0][1]).toBe("queen");
    });

    test.skip("Search in Audios", async () => {
        const result = await API.search.inAudios("Umineko");
        expect(result).toBeTruthy();
    });
});

describe("Artists", () => {
    test.only("Get Artist", async () => {
        const result = await API.artists.get("electriccallboy");  
        expect(result).toBeTruthy();
    });

    test("Get Artist Audio", async () => {
        const result = await API.artists.audio("Queen");
        expect(result.items.length).toBe(100);
    });

    test("Get Artist Playlists", async () => {
        const result = await API.artists.playlists("Queen");
        expect(result.items.length).toBe(result.count);
    });
});

describe("General", () => {
    test.skip("Load", async () => {
        const results = await API.general.load();
        expect(results).toBeTruthy();
    });
});

describe("Explore", () => {
    test("Load", async () => {
        const results = await API.explore.load();
        expect(results).toBeTruthy();
    });
});