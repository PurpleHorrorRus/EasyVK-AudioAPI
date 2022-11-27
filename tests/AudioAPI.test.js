// eslint-disable-next-line no-unused-vars
const fs = require("fs-extra");
const readline = require("readline");
const path = require("path");

const { CallbackService } = require("vk-io");
const { DirectAuthorization, officialAppCredentials } = require("@vk-io/authorization");

const AudioAPI = require("../index.js");

let credits = require("../vk.json");

const timeout = 5; // mins
jest.setTimeout(timeout * 60 * 1000);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let API = null;
let allowOfficialAPI = false;

const callbackService = new CallbackService();
callbackService.onTwoFactor(async (_payload, retry) => {
    const code = await new Promise(resolve => rl.question("Two factor code", resolve));
    await retry(code);
});

const direct = new DirectAuthorization({
    callbackService,

    login: credits.username,
    password: credits.password,
    scope: "all",

    ...officialAppCredentials.android
});

beforeAll(async () => {
    if (!credits.token) {
        const data = await direct.run();
        credits.token = data.token;
        fs.writeJSONSync("./vk.json", credits, { spaces: 4 });
    }

    API = await new AudioAPI(credits.token, { lang: "ru" }, { debug: true })
        .login({
            username: credits.username,
            password: credits.password
        }, { cookies: "./cookie.json" });

    allowOfficialAPI = await API.official.check();
});

describe("AudioAPI", () => {
    test("Get Audios", async () => {
        const data = await API.audio.get({
            owner_id: 243263728,
            raw: true,
            count: 2
        });

        expect(data.audios.length).toBeGreaterThan(0);
    });

    test("Get All Audios", async () => {
        const data = await API.audio.getAll({ raw: true });
        expect(data.audios.length).toBeGreaterThan(0);
    });

    test("Call official API", async () => {
        if (!allowOfficialAPI) {
            expect(true).toBe(true);
        }

        const response = await API.official.call("audio.getById", {
            audios: "2000294643_456244556"
        }).catch(error => {
            console.error(error);
            return [];
        });

        expect(response).toBeGreaterThan(0);
    });

    test("Get raw audio and raw link and parse", async () => {
        const { audios } = await API.audio.get({
            count: 2,
            raw: true
        });

        const [full] = await API.audio.parse([audios[0].raw]);
        expect(full).toBeTruthy();
    });

    test("Get Raw Audios", async () => {
        const raw = await API.audio.get({ raw: true });
        expect(raw.audios).toBeTruthy();
    });

    test("Get Lyrics", async () => {
        const lyrics = await API.audio.getLyrics({ lyrics_id: 446974289 });
        expect(lyrics).toBeTruthy();
    });

    test("Get Audios From Wall", async () => {
        const audios = await API.audio.getFromWall({
            owner_id: 529592613,
            post_id: 108,
            raw: true
        });

        expect(audios).toBeTruthy();
    });

    let add = null;

    test.skip("Add song", async () => {
        const playlist = await API.audio.getPlaylist({
            owner_id: 215185126,
            playlist_id: 2,
            list: true
        });

        add = await API.audio.add(playlist.list[0]);
        expect(add).toBeTruthy();
    });

    test.skip("Delete song", async () => {
        const { audios } = await API.audio.get();
        const deleted = await API.audio.delete(audios[0]);
        expect(deleted).toBe(true);
    });

    test.skip("Reorder songs", async () => {
        const response = await API.audio.get({
            owner_id: credits.user,
            count: 3
        });

        const reordered = await API.audio.reorder({
            owner_id: credits.user,
            audio_id: response.audios[0].id,
            after: response.audios[2].id
        });

        expect(reordered).toBe(1);
    });

    test.skip("Edit song", async () => {
        const response = await API.audio.get({
            owner_id: credits.user,
            count: 1
        });

        const edited = await API.audio.edit(response.audios[0], {
            artist: response.audios[0].artist,
            title: response.audios[0].title,
            genre: 0
        });

        expect(edited).toBe(1);
    });

    test.skip("Upload Audio", async () => {
        const saved = await API.audio.upload("./test.mp3");
        expect(saved).toBeTruthy();
    });

    test.skip("Audio Status", async () => {
        const { audios } = await API.audio.get();
        await API.toggleAudioStatus({
            enable: true,
            raw_audio_id: audios[0].full_id
        });

        await API.changeAudioStatus({ raw_audio_id: audios[1].full_id });
    });

    test.skip("Upload Audio", async () => {
        const path = "PUT PATH HERE";
        const saved = await API.audio.upload(path);
        expect(saved).toBeTruthy();
    });

    test("Follow and Unfollow User or Community", async () => {
        const data = await API.audio.get({
            owner_id: -31672253,
            count: 0
        });

        const followed = await API.audio.follow(data.follow);
        expect(followed).toBe(true);

        const unfollowed = await API.audio.unfollow(data.follow);
        expect(unfollowed).toBe(true);
    });
});

describe("Playlists", () => {
    test("Get Playlists", async () => {
        const { playlists, count } = await API.playlists.get();
        expect(playlists.length).toBeGreaterThanOrEqual(0);
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test("Get Playlists Count", async () => {
        const count = await API.playlists.getCount();
        expect(count).toBeGreaterThan(0);
    });

    test("Get Playlist By Id", async () => {
        const result = await API.playlists.getPlaylist({
            owner_id: credits.user,
            playlist_id: 186,
            raw: true
        });

        expect(result).toBeTruthy();
    });

    test("Get Playlist From Wall", async () => {
        const playlist = await API.playlists.getFromWall({
            owner_id: -9125493,
            playlist_id: 62695084
        });

        expect(playlist).toBeTruthy();
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
        const { playlists } = await API.playlists.get();
        const deleted = await API.playlists.delete(playlists[0]);
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
        const { audios } = await API.audio.get();
        let { playlists } = await API.playlists.get();
        playlists = playlists.filter(playlist => playlist.owner_id === credits.user);

        const result = await API.playlists.addSong(audios[0], playlists[0]);
        expect(result).toBe(true);
    });

    test.skip("Remove song from playlist", async () => {
        const playlist = await API.playlists.getPlaylist({
            playlist_id: 5,
            list: true
        });

        const result = await API.playlists.removeSong(playlist.list[0], playlist);
        expect(result).toBe(true);
    });

    test.skip("Reorder Playlists", async () => {
        const response = await API.playlists.get();
        const reordered = await API.playlists.reorder({
            playlist_id: response.playlists[1].playlist_id,
            before: response.playlists[0].playlist_id // or after
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
        const search = await API.search.queryExtended("Queen", { raw: true });
        expect(search).toBeTruthy();
    });

    test("Search Hints", async () => {
        const results = await API.search.hints({ q: "Que" });
        expect(results[0][1]).toBe("queen");
    });

    test("Search in Audios", async () => {
        const result = await API.search.inAudios({
            owner_id: -41670861,
            q: "Twil",
            raw: true
        });

        expect(result).toBeTruthy();
    });
});

describe("Artists", () => {
    test("Get Artist", async () => {
        const result = await API.artists.get("Queen", { raw: true });
        expect(result).toBeTruthy();
    });

    test("Get Similar Artists", async () => {
        const result = await API.artists.similar("Queen");
        expect(result).toBeTruthy();
    });

    test("Get Artist's Collecitons", async () => {
        const artist = await API.artists.get("multiverse", { raw: true });
        const releases = await API.artists.collections(artist.collections[0].link);
        const singles = await API.search.morePlaylists(releases[1].link);
        expect(singles).toBeTruthy();
    });

    test("Get Artist Popular Songs", async () => {
        const result = await API.search.more("artist/wildways/top_audios", { raw: true });
        expect(result).toBeTruthy();
    });

    test("Get More Artist Top Songs", async () => {
        let result = await API.search.more("artist/queen/top_audios", { raw: true });
        result = await API.search.withMore(result.more);
        expect(result).toBeTruthy();
    });

    test("Get Artist Playlists", async () => {
        const result = await API.search.morePlaylists("artist/multiverse/releases");
        expect(result).toBeTruthy();
    });

    test("Get More Artist Playlists", async () => {
        const result = await API.search.morePlaylists("artist/queen/albums");
        expect(result).toBeTruthy();
    });

    test("Follow and Unfollow artist", async () => {
        const artist = await API.artists.get("queen");

        artist.follow.hash = await API.artists.follow(artist.follow);
        expect(artist.follow.hash).toBeTruthy();

        artist.follow.hash = await API.artists.follow(artist.follow);
        expect(artist.follow.hash).toBeTruthy();
    });
});

describe("General", () => {
    test("Load", async () => {
        const results = await API.general.load({
            raw: true
        });

        expect(results).toBeTruthy();
    });

    test("Get Users Playlists", async () => {
        const playlists = await API.general.usersPlaylists();
        expect(playlists).toBeTruthy();
    });
});

describe("Explore", () => {
    test("Load", async () => {
        const results = await API.explore.load({
            count: 6,
            raw: true
        });

        expect(results).toBeTruthy();
    });

    test("Get New Albums", async () => {
        const results = await API.explore.newAlbums();
        expect(results).toBeTruthy();
    });

    test("Get New Releases", async () => {
        const releases = await API.explore.newReleases({
            count: 6,
            raw: true
        });

        expect(releases).toBeTruthy();
    });

    test("Get Chart", async () => {
        const chart = await API.explore.chart({
            count: 6,
            raw: true
        });

        expect(chart).toBeTruthy();
    });

    test("Get New Songs", async () => {
        const results = await API.search.getByBlock({
            block: "new_songs",
            section: "explore",
            raw: true
        });

        expect(results).toBeTruthy();
    });

    test("Friend Updates", async () => {
        const results = await API.getFriendsUpdates({ raw: true });
        expect(results).toBeTruthy();
    });
});

describe("Downloading", () => {
    test("Audio (Buffer Output)", async () => {
        const { audios } = await API.audio.get({
            count: 1
        });

        const buffer = await audios[0].download({
            ffmpegPath: path.resolve("ffmpeg.exe"),
            outputFolder: path.resolve("hls"),
            name: `${audios[0].performer} - ${audios[0].title}`,
            chunksFolder: path.resolve("hls", String(audios[0].id)),
            delete: true
        });

        expect(buffer).toBeTruthy();
    });

    test("Audio (Output Path)", async () => {
        const { audios } = await API.audio.get({
            count: 1
        });

        const output = await audios[0].download({
            ffmpegPath: path.resolve("ffmpeg.exe"),
            outputFolder: path.resolve("hls"),
            name: `${audios[0].performer} - ${audios[0].title}`,
            chunksFolder: path.resolve("hls", String(audios[0].id)),
            delete: false
        });

        expect(output.length).toBeGreaterThan(0);
        fs.removeSync(output);
    });

    test("Audio (Output Path / Independent Instance)", async () => {
        const { items: audios } = await API.official.call("audio.get", {
            owner_id: credits.user,
            count: 1
        });

        const output = await new API.DownloadInstance(audios[0], {
            ffmpegPath: path.resolve("ffmpeg.exe"),
            outputFolder: path.resolve("hls"),
            name: `${audios[0].artist} - ${audios[0].title}`,
            chunksFolder: path.resolve("hls", String(audios[0].id)),
            delete: false
        }).download();

        expect(output.length).toBeGreaterThan(0);
        fs.removeSync(output);
    });
});