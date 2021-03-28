const querystring = require("querystring");

const Static = require("../static");

const regex = {
    album: /album\/(.*)/,
    artist: /artist\/(.*)/
};

class RecomsStatic extends Static {
    buildCollection (object) {
        try {
            const block_props = object
                .querySelector(".BannerItem__link")
                .attributes.href
                .match(/\?(.*)/)[1];

            const { block } = querystring.parse(block_props);
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

    getCover (item, className = ".BannerItem--cover") {
        try {
            return item
                .querySelector(className)
                .attributes.style
                .match(/background-image:url\((.*?)\)/)[1]
                .replaceAll("'", "");
        } catch (e) {
            return null;
        }
    }

    buildAlbum (item) {
        const title = item.querySelector(".BannerItem__title").text;
        const text = item.querySelector(".BannerItem__text").innerHTML;
        
        const image = this.getCover(item, ".BannerItem--cover") || this.getCover(item, ".BannerItem__image");

        let data = {
            title,
            text,
            image
        };

        const link = item
            .querySelector(".BannerItem__link")
            .attributes.href;

        const isAlbum = regex.album.test(link);

        if (isAlbum) {
            const [owner_id, playlist_id, access_hash] = link
                .match(regex.album)[1]
                .split("_");

            data = {
                ...data,
                type: "album",
                owner_id: Number(owner_id),
                playlist_id: Number(playlist_id),
                access_hash
            };
        } else {
            const isArtist = regex.artist.test(link);

            if (isArtist) {
                const [, artist] = link.match(regex.artist);
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