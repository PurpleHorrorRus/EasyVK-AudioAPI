const Static = require("../static");

const regex = {
    album: /album\/(.*)/,
    artist: /artist\/(.*)/
};

const classes = {
    LINK: ".BannerItem__link",
    COVER: ".Banner__backgroundImage",
    COVER_ALT: ".BannerItem__image",
    TITLE: ".BannerItem__title",
    TEXT: ".BannerItem__text"
};

class ExploreStatic extends Static {
    buildCollection (object) {
        try {
            const block_props = object.querySelector(classes.LINK).attributes.href.match(/\?(.*)/)[1];
            const { block } = new URLSearchParams(block_props);

            const image = this.getCover(object, classes.COVER) || this.getCover(object, classes.COVER_ALT);
            const name = object.querySelector(classes.TITLE).text;
            const updated_text = object.querySelector(classes.TEXT).text;

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
        let data = {
            title: item.querySelector(classes.TITLE).innerHTML,
            text: item.querySelector(classes.TEXT).innerHTML,
            image: this.getCover(item, classes.COVER) || this.getCover(item, classes.COVER_ALT)
        };

        const link = item
            .querySelector(classes.LINK)
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
            if (regex.artist.test(link)) {
                data = {
                    ...data,
                    type: "artist",
                    artist: link.match(regex.artist)[1]
                };
            } else {
                return null;
            }
        }

        return data;
    }
}

module.exports = ExploreStatic;