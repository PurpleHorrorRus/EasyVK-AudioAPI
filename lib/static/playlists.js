const HTMLParser = require("node-html-parser");
const Promise = require("bluebird");

const Static = require("../static");
const AudioRequests = require("../requests/audio");
const ArtistsStatic = require("../static/artists");

const infoTemplate = /showAudioPlaylist\((.*?)\)/;
const followTemplate = /followPlaylist\((.*?)\)/;
const authorLinkRegex = /href=\"(.*?)\"/;
const authorNameRegex = />(.*?)</;
const avatarRegex = /background-image:url\(\'(.*)\'/;
const backgroundRegex = /(background\-color|background\-image):(.*)/;
const coversRegex = /background-image:url\(\'(.*)\'/g;

class PlaylistsStatic extends Static {
    constructor (client, params) {
        super(client, params);

        this.AudioRequests = new AudioRequests(client, params);
        this.ArtistsStatic = new ArtistsStatic(client, params);

        this.classes = {
            ...this.classes,

            FOLLOWED: "audio_pl__followed",

            RECOMS: {
                BLOCK: ".RecomsPlaylist",
                INFO: ".RecomsPlaylist__actions",
                TITLE: ".RecomsPlaylist__title",
                SUBTITLE: ".RecomsPlaylist__subtitle"
            },

            RECOMMENDED_PLAYLIST: {
                header: {
                    block: ".CatalogBlock__recommended_playlists_extended_header",
                    title: ".CatalogBlock__title"
                },

                item: ".RecommendedPlaylist",
                top: ".RecommendedPlaylist__top",
                backdrop: ".RecommendedPlaylist__backdrop",
                title: ".RecommendedPlaylist__title",
                audios: ".RecommendedPlaylist__audios",

                match: {
                    value: ".RecommendedPlaylist__matchValue",
                    text: ".RecommendedPlaylist__matchText",
                },

                owner: {
                    avatar: ".RecommendedPlaylist__ownerImage",
                    name: ".RecommendedPlaylist__ownerName"
                }
            }
        };
    }

    getAuthor (playlist) {
        const authorLine = playlist.authorLine || playlist.authorName;

        if (!authorLinkRegex.test(authorLine) || !authorNameRegex.test(authorLine)) {
            return null;
        }

        const link = authorLine.match(authorLinkRegex)[1];
        const id = link.replaceAll("https://vk.com", "").replace("/audios", "");

        return {
            id: Number(id) || id || link,
            name: this.unescape(authorLine.match(authorNameRegex)[1])
        };
    }

    getPlaylistInfo (playlist) {
        return {
            owner_id: playlist.owner_id || playlist.ownerId,
            playlist_id: playlist.playlist_id || playlist.id,
            raw_id: playlist.raw_id || `${playlist.ownerId}_${playlist.id}`,
            title: this.unescape(playlist.title),
            cover_url: playlist.coverUrl ?? playlist.thumb ?? "",
            permissions: playlist.permissions,
            last_updated: playlist.lastUpdated || playlist.last_updated,
            explicit: playlist.explicit ?? Boolean(playlist.isExplicit) ?? false,
            followed: playlist.followed || Boolean(playlist.isFollowed) || Boolean(playlist.is_followed),
            official: playlist.official ?? Boolean(playlist.isOfficial) ?? Boolean(playlist.is_official),
            restricted: Boolean(playlist.restricted),
            listens: Number(playlist.listens) || 0,
            size: Number(playlist.size) || Number(playlist.totalCount) || 0,
            follow_hash: playlist.followHash || playlist.follow_hash || "",
            edit_hash: playlist.editHash || playlist.edit_hash || "",
            covers: playlist.gridCovers ? Array.from(playlist.gridCovers.matchAll(coversRegex), ([, link]) => link) : [],
            description: playlist.description ? this.unescape(playlist.description) : "",
            raw_description: playlist.rawDescription,
            context: playlist.context || playlist.type || "",
            access_hash: playlist.accessHash || playlist.access_hash || "",
            author: this.getAuthor(playlist)
        };
    }

    builderHTML (html) {
        return !/RecomsPlaylist/.test(html)
            ? this.buildPlaylists(html)
            : this.buildRecoms(html);
    }

    getInfo(block) {
        if (!infoTemplate.test(block.innerHTML)) {
            return {};
        }

        const match = block.innerHTML.match(infoTemplate)[1].split(", ");

        const owner_id = Number(match[0]);
        const playlist_id = Number(match[1]);

        return {
            owner_id, playlist_id,
            access_hash: match[2].replaceAll("'", ""),
            code: match[3]?.replaceAll("'", "") || "",
            raw_id: `${owner_id}_${playlist_id}`
        };
    }

    getFollowInfo(block) {
        const html = block.innerHTML;

        if (followTemplate.test(html)) {
            const match = block.innerHTML.match(followTemplate)[1].split(", ");
            const classes = Array.from(block.classList.values());

            return {
                owner_id: Number(match[1]),
                playlist_id: Number(match[2]),
                follow_hash: match[3].replaceAll("'", ""),
                followed: classes.includes(this.classes.FOLLOWED) || html.includes(this.classes.FOLLOWED)
            };
        }

        return [];
    }

    buildPlaylist(block) {
        const { owner_id, playlist_id, access_hash } = this.getInfo(block);

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
            access_hash: access_hash?.replaceAll("'", ""),
            owner_id: Number(owner_id),
            playlist_id: Number(playlist_id),
            raw_id: `${owner_id}_${playlist_id}`,
            title: this.unescape(block.querySelector(this.classes.PLAYLIST.ITEM.TITLE).text),
            cover_url: this.getCover(block),
            size: sizeBlock ? Number(sizeBlock.text) : 0,
            listens: listensBlock ? listensBlock.text : 0,
            artists,
            year: Number(year),
            subtitle
        };
    }

    buildPlaylists (html) {
        const parsed = HTMLParser.parse(html);
        const items = parsed.querySelectorAll(this.classes.PLAYLIST.ITEM.BLOCK);
        return items.map(block => {
            return this.buildPlaylist(block);
        });
    }

    buildRecoms (html) {
        const parsed = HTMLParser.parse(html);
        const blocks = parsed.querySelectorAll(this.classes.RECOMS.BLOCK);
        return blocks.map(block => {
            const { owner_id, playlist_id, code } = this.getInfo(block);

            return {
                code: code.replaceAll("'", ""),
                owner_id: Number(owner_id),
                playlist_id: Number(playlist_id),
                raw_id: `${owner_id}_${playlist_id}`,
                title: this.unescape(block.querySelector(this.classes.RECOMS.TITLE).text.replaceAll("'", "")),
                subtitle: this.unescape(block.querySelector(this.classes.RECOMS.SUBTITLE).text.replaceAll("'", "")),
                cover_url: this.getCover(block),
                size: -1
            };
        });
    }

    async getRecommended(page, params) {
        const users_playlists = {
            type: "users_playlists",
            title: "",
            playlists: []
        };

        const parsed = HTMLParser.parse(page);
        const block = parsed.querySelector(this.classes.RECOMMENDED_PLAYLIST.header.block)?.parentNode;
        return await this.buildRecommendedBlock(block, users_playlists, params);
    }

    async buildRecommendedBlock(block, reference, params = {}) {
        if (!block) {
            return reference;
        }

        const title = block.querySelector(this.classes.RECOMMENDED_PLAYLIST.header.title).text;
        return {
            ...reference,
            title: this.unescape(title),
            playlists: await this.buildRecommendedPlaylists(block, params),
            ...this.parseLink(block)
        };
    }

    async buildRecommendedPlaylists(block, params = {}) {
        const items = block.querySelectorAll(this.classes.RECOMMENDED_PLAYLIST.item);

        return await Promise.map(items, async item => {
            const top = item.querySelector(this.classes.RECOMMENDED_PLAYLIST.top);
            const matchValue = item.querySelector(this.classes.RECOMMENDED_PLAYLIST.match.value).text;

            const audiosBlock = item.querySelector(this.classes.RECOMMENDED_PLAYLIST.audios);
            const audios = this.AudioRequests.builderHTML(audiosBlock.innerHTML);

            const ownerBlock = item.querySelector(this.classes.RECOMMENDED_PLAYLIST.owner.name);
            const ownerAvatar = item.querySelector(this.classes.RECOMMENDED_PLAYLIST.owner.avatar);

            return {
                background: top.attributes.style.match(backgroundRegex)[0],

                playlist: this.getPlaylistInfo({
                    ...this.getInfo(item),
                    ...this.getFollowInfo(item),
                    title: item.querySelector(this.classes.RECOMMENDED_PLAYLIST.title).text
                }),

                match: {
                    value: parseInt(matchValue),
                    text: item.querySelector(this.classes.RECOMMENDED_PLAYLIST.match.text).text
                },

                owner: ownerBlock
                    ? {
                        name: ownerBlock?.text,
                        avatar: this.fixAvatar(ownerAvatar?.attributes.style.match(avatarRegex)[1])
                    } : null,

                audios: await this.AudioRequests.parseAudios(audios, params)
            };
        });
    }

    builder (item) {
        if (!item) {
            return [];
        }

        switch (typeof item) {
            case "string": {
                return this.builderHTML(item);
            }

            case "object": {
                return item.payload[1][1].playlists.map(playlist => {
                    return this.getPlaylistInfo(playlist);
                });
            }
        }
    }

    parseLink (object) {
        if (!object) {
            return {};
        }

        object = object.querySelector(this.classes.PLAYLIST.COLLECTIONS.LINK);

        if (object) {
            return {
                link: object.attributes.href,
                params: new URLSearchParams(object.attributes.href.replace(/(.*?)\?/, ""))
            };
        }

        return {};
    }

    buildCollections (html) {
        const root = HTMLParser.parse(typeof html === "string" ? html : html[0]);
        const collectionsBlocks = root.querySelectorAll(this.classes.BLOCK);
        const playlistsBlocks = collectionsBlocks.filter(collection => {
            return collection.querySelector(this.classes.PLAYLIST.COLLECTIONS.PAGE);
        });

        return playlistsBlocks.map(object => {
            return this.buildCollection(object);
        });
    }

    buildCollection (object) {
        const playlistsBlock = object.querySelector(this.classes.PLAYLIST.COLLECTIONS.PAGE);
        const textBlock = object.querySelector(this.classes.PLAYLIST.COLLECTIONS.TITLE);

        return {
            type: "recommendations",
            title: this.unescape(textBlock.text),
            playlists: this.builder(playlistsBlock.innerHTML),
            ...this.parseLink(object)
        };
    }

    buildCollectionPage (object) {
        const titleBlock = object.querySelector(this.classes.PLAYLIST.COLLECTIONS.TITLE);

        if (titleBlock) {
            return {
                title: this.unescape(titleBlock.text),
                ...this.parseLink(object)
            };
        }

        return {
            title: this.unescape(this.collectionTitle),
            playlists: this.builder(object.querySelector(this.classes.PLAYLIST.COLLECTIONS.PAGE).innerHTML),
            ...this.collectionLink
        };
    }

    fixAvatar(avatar) {
        if (!avatar) {
            return "";
        }

        return /https:\/\//.test(avatar)
            ? avatar
            : `https://vk.com${avatar}`;
    }
}

module.exports = PlaylistsStatic;