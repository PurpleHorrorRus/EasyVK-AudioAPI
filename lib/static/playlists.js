const HTMLParser = require("node-html-parser");
const querystring = require("querystring");

const Static = require("../static");

class PlaylistsStatic extends Static {
    constructor (client, params) {
        super(client, params);
        this.coversRegex = RegExp("background-image:url\(\'(.*?)\'\)", "gm");
    }

    getPlaylistInfo (playlist) {
        const covers = playlist.gridCovers ? playlist.gridCovers.matchAll(this.coversRegex) : [];
        return {
            id: playlist.id,
            owner_id: playlist.ownerId,
            raw_id: `${playlist.ownerId}_${playlist.id}`,
            title: this.unescape(playlist.title),
            cover_url: playlist.coverUrl,
            last_updated: playlist.lastUpdated,
            explicit: playlist.isExplicit || false,
            followed: playlist.isFollowed,
            official: playlist.isOfficial,
            listens: Number(playlist.listens) || 0,
            size: playlist.totalCount,
            follow_hash: playlist.followHash,
            edit_hash: playlist.editHash,
            covers,
            description: playlist.description,
            raw_description: playlist.rawDescription,
            context: playlist.context || playlist.type || "",
            access_hash: playlist.accessHash,
            playlist_id: playlist.id
        };
    }

    build (html) {
        const title_template = /\(this\)\)">(.*?)</;
        const cover_template = /background-image: url\(\'(.*?)\'/;
        const info_template = /showAudioPlaylist\((.*?)\)/;
        const subtitle_template = /(.*?)<(.*)>(.*)/; // ... ?

        const root = HTMLParser.parse(html);
        const blocks = root.querySelectorAll("._audio_pl_item");

        const playlists = blocks.map(block => {
            const inner = block.innerHTML;
            const title = title_template.test(inner) ? inner.match(title_template)[1] : "";
            const cover = cover_template.test(inner) ? inner.match(cover_template)[1] : "";
            const info  = info_template.test(inner) ? inner.match(info_template)[1].split(", ") : [];

            const [owner_id, playlist_id, access_hash] = info;
            const raw_id = `${owner_id}_${playlist_id}`;
            const root_block = HTMLParser.parse(inner);
            const subtitle_block = root_block.querySelector(".audio_pl__year_subtitle");
            
            let year = "";
            let subtitle = "";

            if (subtitle_block) {
                const subtitle_inner = subtitle_block.innerHTML;

                if (subtitle_template.test(subtitle_inner)) {
                    const match = subtitle_inner.match(subtitle_template);
                    year = match[1];
                    subtitle = match[3];
                }
            }
            
            return { 
                access_hash: access_hash.replaceAll("'", ""), 
                owner_id: Number(owner_id), 
                playlist_id: Number(playlist_id), 
                raw_id, 
                title, 
                cover_url: cover, 
                year: Number(year), 
                subtitle 
            };
        });

        return playlists;
    }

    buildPlaylistsMobile (object, classes = {
        link: ".audioPlaylists__itemLink",
        title: ".audioPlaylists__itemTitle",
        cover: ".audioPlaylists__itemCover",
        subtitle: ".audioPlaylists__itemSubtitle"
    }) {
        let ready = {};

        const data = object.querySelector(classes.link)
            .attributes.href
            .replace("/audio?", "");

        const { access_hash, act } = querystring.decode(data);
        const raw_id = act.match(/audio_playlist(.*)/)[1];
        const [owner_id, playlist_id] = raw_id.split("_");

        const title = object.querySelector(classes.title)
            .text;

        const cover_url = object.querySelector(classes.cover)
            .attributes.style
            .match(/background-image: url\('(.*?)'\)/)[1];

        const [subtitle_object, year_object] = object.querySelectorAll(classes.subtitle);

        ready = {
            access_hash,
            owner_id: Number(owner_id),
            playlist_id: Number(playlist_id),
            raw_id,
            cover_url,
            title
        };
        
        if (subtitle_object) {
            ready = {
                ...ready,
                ...{ subtitle: subtitle_object.text }
            };
        }

        if (year_object) {
            ready = {
                ...ready,
                ...{ year: Number(year_object.text) }
            };
        }

        if (classes.stats) {
            const stats_object = object.querySelector(classes.stats);

            if (stats_object) {
                ready = {
                    ...ready,
                    ...{ stats: stats_object.text }
                };
            }
        }

        return ready;
    }

    getPlaylistByHTML (playlist) {
        try {
            const info = playlist.childNodes[1];
            const raw = info.rawAttrs;
        
            const bod = HTMLParser.parse(playlist.innerHTML);
            const title_object = bod.querySelector(".audio_pl__title");
            const title = title_object.text.replaceAll("\n", "").trim();
        
            const cover = raw.match(/background-image: url\(\'(.*?)\'\)/)[1];
            const match = raw.match(/showAudioPlaylist\((.*?)\)/)[1];
            const split = match.split(", ");
            const owner_id = split[0], 
                playlist_id = split[1], 
                access_hash = split[2] === "''" ? "" : split[2].replaceAll("'", "");
        
            return { 
                access_hash, 
                owner_id, 
                playlist_id, 
                cover, 
                title, 
                raw_id: `${owner_id}_${playlist_id}`
            };
        } catch (e) { return null; }
    }

    getGenreByHTML (html) {
        const root = HTMLParser.parse(html);
        const inner = root.querySelectorAll(".CatalogBlock");
        let pl_objects = [];
        let name = "";
        let block = "";
        const genres = {};

        for (const inner_object of inner) {
            try { 
                const inner_parsed = HTMLParser.parse(inner_object.innerHTML);
                try {
                    name = inner_parsed.querySelectorAll(".CatalogBlock__title")[0].text;
                    block = inner_parsed.innerHTML.match(/&block=(.*?)\"/)[1];
                } catch (e) { continue; }
                pl_objects = inner_parsed.querySelectorAll(".audio_pl_item2");
                for (const object of pl_objects) {
                    const dom = HTMLParser.parse(object.innerHTML);
                    if (dom.childNodes[1] === null) continue;
                    const playlist = this.getPlaylistByHTML(dom);
                    if (playlist === null) continue;
                    if (!genres[block]) {
                        genres[block] = { 
                            name,
                            block, 
                            playlists: [] 
                        };
                    }
                    genres[block].playlists.push(playlist);
                }
            } catch(e) { return []; }
        }

        return genres;
    }
}

module.exports = PlaylistsStatic;