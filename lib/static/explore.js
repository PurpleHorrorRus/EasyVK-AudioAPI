const Static = require("../static");

const regex = {
    album: /album\/(.*)/,
    artist: /artist\/(.*)/
};

class ExploreStatic extends Static {
    constructor (client, params) {
        super(client, params);

        this.classes = {
            ...this.classes,
            LINK: ".BannerItem__link",
            COVER_ALT: ".BannerItem__image",
            TITLE: ".BannerItem__title",
            TEXT: ".BannerItem__text",
            SUBTEXT: ".BannerItem__subtext"
        };
    }

    buildCollection (object) {
        try {
            const props = object
                .querySelector(this.classes.LINK)
                .attributes.href
                .match(/\?(.*)/)[1];;

            return {
                block: new URLSearchParams(props).block,
                image: this.getCover(object),
                name: object.querySelector(this.classes.TITLE).text,
                updated_text: object.querySelector(this.classes.TEXT).text
            };
        } catch (e) {
            return null;
        }
    }

    buildAlbum (item) {
        let data = {
            title: this.unescape(item.querySelector(this.classes.TITLE).innerHTML),
            text: this.unescape(item.querySelector(this.classes.TEXT).innerHTML),
            subtext: item.querySelector(this.classes.SUBTEXT).text,
            image: this.getCover(item)
        };

        const link = item
            .querySelector(this.classes.LINK)
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
                access_hash,
                size: -1
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

    buildRadio (radio) {
        return {
            id: radio[0],
            owner_id: radio[1],
            url: radio[2],
            title: radio[3],
            icon: radio[14],
            raw_id: `${radio[1]}_${radio[0]}`,
            ...radio[12]
        };
    }
}

module.exports = ExploreStatic;