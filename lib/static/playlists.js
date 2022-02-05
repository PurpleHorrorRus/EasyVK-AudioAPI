const HTMLParser = require("node-html-parser");

const Static = require("../static");
const ArtistsStatic = require("../static/artists");

const info_template = /showAudioPlaylist\((.*?)\)/;
const coversRegex = /background-image:url\(\'(.*?)\'/g;

class PlaylistsStatic extends Static {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
        this.ArtistsStatic = new ArtistsStatic(client, vk, params);

        this.classes = {
            ...this.classes,
            RECOMS: {
                BLOCK: ".RecomsPlaylist",
                COVER: ".RecomsPlaylist__cover",
                INFO: ".RecomsPlaylist__actions",
                TITLE: ".RecomsPlaylist__title",
                SUBTITLE: ".RecomsPlaylist__subtitle"
            }
        };
    }
    
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
            covers: playlist.gridCovers ? Array.from(playlist.gridCovers.matchAll(coversRegex), ([, link]) => link) : [],
            description: this.unescape(playlist.description),
            raw_description: playlist.rawDescription,
            context: playlist.context || playlist.type || "",
            access_hash: playlist.accessHash || playlist.access_hash || ""
        };
    }

    builderHTML (html) {
        return !/RecomsPlaylist/.test(html)
            ? this.buildPlaylists(html)
            : this.buildRecoms(html);
    }

    buildPlaylists (html) {
        return HTMLParser.parse(html).querySelectorAll(this.classes.PLAYLIST.ITEM.BLOCK).map(block => {
            const [owner_id, playlist_id, access_hash] = info_template.test(block.innerHTML) 
                ? block.innerHTML.match(info_template)[1].split(", ") 
                : [];

            const sizeBlock = block.querySelector(this.classes.PLAYLIST.COUNT),
                listensBlock = block.querySelector(this.classes.PLAYLIST.LISTENS), 
                artistsBlock = block.querySelectorAll(this.classes.PLAYLIST.ITEM.ARTISTS);

            let artists = null;
            if (artistsBlock && artistsBlock.length > 0) {
                artists = artistsBlock.map(artist => ({
                    name: artist.text,
                    link: artist.attributes.href.split(/[#?]/)[0].split("/").pop().trim()
                }));
            }
            
            let year = "";
            let subtitle = "";

            let subtitleBlock = block.querySelector(this.classes.PLAYLIST.YEAR);
            if (subtitleBlock) {
                if (subtitleBlock.childNodes.length >= 1) {
                    year = subtitleBlock.childNodes[0].text;

                    if (subtitleBlock.childNodes.length === 3) {
                        subtitle = subtitleBlock.childNodes[2].text;
                    }
                }
            } else {
                subtitleBlock = block.querySelector(this.classes.PLAYLIST.SUBTITLE);
                if (subtitleBlock) {
                    subtitle = subtitleBlock.text;
                }
            }
            
            return { 
                access_hash: access_hash.replaceAll("'", ""), 
                owner_id: Number(owner_id), 
                playlist_id: Number(playlist_id), 
                raw_id: `${owner_id}_${playlist_id}`, 
                title: this.unescape(block.querySelector(this.classes.PLAYLIST.ITEM.TITLE).text), 
                cover_url: this.getCover(block, this.classes.PLAYLIST.ITEM.COVER),
                size: sizeBlock ? Number(sizeBlock.text) : 0,
                listens: listensBlock ? listensBlock.text : 0,
                artists,
                year: Number(year), 
                subtitle 
            };
        });
    }

    buildRecoms (html) {
        return HTMLParser.parse(html).querySelectorAll(this.classes.RECOMS.BLOCK).map(block => {
            const [owner_id, playlist_id, , code] = info_template.test(block.innerHTML) 
                ? block.innerHTML.match(info_template)[1].split(", ") 
                : [];

            return { 
                code: code.replaceAll("'", ""),
                owner_id: Number(owner_id),
                playlist_id: Number(playlist_id),
                raw_id: `${owner_id}_${playlist_id}`,
                title: this.unescape(block.querySelector(this.classes.RECOMS.TITLE).text.replaceAll("'", "")),
                subtitle: this.unescape(block.querySelector(this.classes.RECOMS.SUBTITLE).text.replaceAll("'", "")),
                cover_url: this.getCover(block, this.classes.RECOMS.COVER) 
            };
        });
    }

    builder (item) {
        if (!item) {
            return [];
        }

        switch (typeof item) {
            case "string" :{
                return this.builderHTML(item);
            }
            case "object": {
                return item.payload[1][1].playlists.map(playlist => this.getPlaylistInfo(playlist));
            }
        }
    }

    parseLink (object) {
        if (!object) {
            return {};
        }

        object = object.querySelector(this.classes.PLAYLIST.COLLECTIONS.LINK);

        return object
            ? { 
                link: object.attributes.href,
                params: new URLSearchParams(object.attributes.href.replace(/(.*?)\?/, ""))
            }
            : {};
    }

    buildCollections (html) {
        const root = HTMLParser.parse(typeof html === "string" ? html : html[0]);
        const collectionsBlocks = root.querySelectorAll(this.classes.BLOCK);
        const playlistsBlocks = collectionsBlocks.filter(c => c.querySelector(this.classes.PLAYLIST.COLLECTIONS.PAGE));
        return playlistsBlocks.map(object => this.buildCollection(object));
    }

    buildCollection (object) {
        return {
            title: this.unescape(object.querySelector(this.classes.PLAYLIST.COLLECTIONS.TITLE).text),
            playlists: this.builder(object.querySelector(this.classes.PLAYLIST.COLLECTIONS.PAGE).innerHTML),
            ...this.parseLink(object)
        };
    }

    buildCollectionPage (object) {
        if (object.querySelector(this.classes.PLAYLIST.COLLECTIONS.TITLE)) {
            this.collectionTitle = this.unescape(object.querySelector(this.classes.PLAYLIST.COLLECTIONS.TITLE).text);
            this.collectionLink = this.parseLink(object);
            return null;
        } else {
            return {
                title: this.unescape(this.collectionTitle),
                playlists: this.builder(object.querySelector(this.classes.PLAYLIST.COLLECTIONS.PAGE).innerHTML),
                ...this.collectionLink
            };
        }
    }
}

module.exports = PlaylistsStatic;