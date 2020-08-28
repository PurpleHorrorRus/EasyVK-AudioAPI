const { parse } = require("querystring");

const Static = require("../static");

class RecomsStatic extends Static {
    constructor (client, params) {
        super(client, params);
        this.regex = {
            album: /album\/(.*)/,
            artist: /artist\/(.*)/
        };
    }

    buildCollection (object) {
        try {
            const block_props = object
                .querySelector(".BannerItem__link")
                .attributes.href
                .match(/\?(.*)/)[1];

            const { block } = parse(block_props);
            const image = object
                .querySelectorAll(".BannerItem__image")[0]
                .attributes.style
                .match(/background-image:url\((.*?)\)/)[1]
                .replaceAll("'", "");

            const name = object.querySelector(".BannerItem__title").text;
            const updated_text = object.querySelector(".BannerItem__text").text;

            return {
                block,
                image,
                name,
                updated_text
            };
        } catch (e) {
            return null;
        }
    }

    buildAlbum (item) {
        const title = item.querySelector(".BannerItem__title").text;
        const text = item.querySelector(".BannerItem__text").innerHTML;
        const image = item
            .querySelector(".BannerItem--cover")
            .attributes.style
            .match(/background-image:url\((.*?)\)/)[1]
            .replaceAll("'", "");

        let data = {
            title,
            text,
            image
        };

        const link = item
            .querySelector(".BannerItem__link")
            .attributes.href;

        const isAlbum = this.regex.album.test(link);

        if (isAlbum) {
            const [owner_id, playlist_id, access_hash] = link
                .match(this.regex.album)[1]
                .split("_");

            data = {
                ...data,
                type: "album",
                owner_id: Number(owner_id),
                playlist_id: Number(playlist_id),
                access_hash
            };
        } else {
            const isArtist = this.regex.artist.test(link);
            if (isArtist) {
                const [, artist] = link.match(this.regex.artist);
                data = Object.assign(data, {
                    type: "artist",
                    artist
                });
            } else {
                return null;
            }
        }

        return data;
    }
}

module.exports = RecomsStatic;