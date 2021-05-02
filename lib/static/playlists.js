const HTMLParser = require("node-html-parser");
const querystring = require("querystring");

const Static = require("../static");

const info_template = /showAudioPlaylist\((.*?)\)/;
const subtitle_template = /(.*?)<(.*)>(.*)/; // 

const coversRegex = /background-image:url\(\'(.*?)\'\)/;

class PlaylistsStatic extends Static {
    getPlaylistInfo (playlist) {
        return {
            playlist_id: playlist.playlist_id || playlist.id,
            owner_id: playlist.owner_id || playlist.ownerId,
            raw_id: playlist.raw_id || `${playlist.ownerId}_${playlist.id}`,
            title: this.unescape(playlist.title),
            cover_url: playlist.coverUrl || playlist.thumb || "",
            last_updated: playlist.lastUpdated || playlist.last_updated,
            explicit: Boolean(playlist.isExplicit) || false,
            followed: Boolean(playlist.isFollowed) || Boolean(playlist.is_followed),
            official: Boolean(playlist.isOfficial) || Boolean(playlist.is_official),
            listens: Number(playlist.listens) || 0,
            size: Number(playlist.size) || Number(playlist.totalCount) || 0,
            follow_hash: playlist.followHash || playlist.follow_hash || "",
            edit_hash: playlist.editHash || playlist.edit_hash || "",
            covers: playlist.gridCovers ? playlist.gridCovers.matchAll(coversRegex) : [],
            description: playlist.description,
            raw_description: playlist.rawDescription,
            context: playlist.context || playlist.type || "",
            access_hash: playlist.accessHash || playlist.access_hash || ""
        };
    }

    build (html) {
        return HTMLParser.parse(html).querySelectorAll(this.classes.PLAYLIST.ITEM.BLOCK).map(block => {
            const title = block.querySelector(this.classes.PLAYLIST.ITEM.TITLE).text;
            const cover = this.getCover(block, this.classes.PLAYLIST.ITEM.COVER);
            const [owner_id, playlist_id, access_hash] = info_template.test(block.innerHTML) 
                ? block.innerHTML.match(info_template)[1].split(", ") 
                : [];

            const sizeBlock = block.querySelector(this.classes.PLAYLIST.COUNT),
                listensBlock = block.querySelector(this.classes.PLAYLIST.LISTENS);
                
            const size = sizeBlock ? Number(sizeBlock.text) : 0,
                listens = listensBlock ? listensBlock.text : 0;

            const raw_id = `${owner_id}_${playlist_id}`;
            
            const artistsBlock = block.querySelectorAll(this.classes.PLAYLIST.ITEM.ARTISTS);

            let artists = null;
            if (artistsBlock && artistsBlock.length > 0) {
                artists = artistsBlock.map(artist => ({
                    name: artist.text,
                    link: artist.attributes.href.split(/[#?]/)[0].split("/").pop().trim()
                }));
            }
            
            const subtitleBlock = block.querySelector(this.classes.PLAYLIST.YEAR);
            
            let year = "";
            let subtitle = "";

            if (subtitleBlock) {
                if (subtitleBlock.childNodes.length >= 1) {
                    year = subtitleBlock.childNodes[0].text;

                    if (subtitleBlock.childNodes.length === 3) {
                        subtitle = subtitleBlock.childNodes[2].text;
                    }
                }
            }
            
            return { 
                access_hash: access_hash.replaceAll("'", ""), 
                owner_id: Number(owner_id), 
                playlist_id: Number(playlist_id), 
                raw_id, 
                title, 
                cover_url: cover,
                size,
                listens,
                artists,
                year: Number(year), 
                subtitle 
            };
        });
    }

    parseLink (object) {
        return object.querySelector(this.classes.PLAYLIST.COLLECTIONS.LINK)
            ? { link: object.querySelector(this.classes.PLAYLIST.COLLECTIONS.LINK).attributes.href }
            : {};
    }

    buildCollection (object) {
        return {
            title: object.querySelector(this.classes.PLAYLIST.COLLECTIONS.TITLE).text,
            playlists: this.build(object.querySelector(this.classes.PLAYLIST.COLLECTIONS.PAGE).innerHTML),
            ...this.parseLink(object)
        };
    }

    buildCollectionPage (object) {
        if (object.querySelector(this.classes.PLAYLIST.COLLECTIONS.TITLE)) {
            this.collectionTitle = object.querySelector(this.classes.PLAYLIST.COLLECTIONS.TITLE).text;
            this.collectionLink = this.parseLink(object);
            return null;
        } else {
            return {
                title: this.collectionTitle,
                playlists: this.build(object.querySelector(this.classes.PLAYLIST.COLLECTIONS.PAGE).innerHTML),
                ...this.collectionLink
            };
        }
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

        const cover_url = this.getCover(object, classes.cover);
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
        
            const body = HTMLParser.parse(playlist.innerHTML);
            const title_object = body.querySelector(this.classes.PLAYLIST.TITLE);
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
        const inner = root.querySelectorAll(this.classes.BLOCK);
        let pl_objects = [];
        let name = "";
        let block = "";
        const genres = {};

        for (const inner_object of inner) {
            try { 
                const inner_parsed = HTMLParser.parse(inner_object.innerHTML);
                try {
                    name = inner_parsed.querySelectorAll(this.classes.PLAYLIST.COLLECTIONS.TITLE)[0].text;
                    block = inner_parsed.innerHTML.match(/&block=(.*?)\"/)[1];
                } catch (e) { continue; }
                pl_objects = inner_parsed.querySelectorAll(this.classes.PLAYLIST.ITEM.BLOCK);
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