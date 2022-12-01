const HTMLParser = require("node-html-parser");
const Static = require("../static");

const cover_template = /background-image:\s?url\('?(.*?)'?\)/;
const link_template = /\/artist\/(.*?)\?/;

class ArtistsStatic extends Static {
    constructor (client, params) {
        super(client, params);

        this.classes = {
            ...this.classes,
            ARTIST_BLOCK: {
                COVER: ".audio_block_small_item__img",
                TITLE: ".audio_block_small_item__title",
                LINK: ".title_link"
            }
        };
    }

    buildBlock (block) {
        return {
            title: this.unescape(block.querySelector(this.classes.ARTIST_BLOCK.TITLE).text),
            cover: block.querySelector(this.classes.ARTIST_BLOCK.COVER)?.attributes.style?.match(cover_template)?.[1],
            link: block.querySelector(this.classes.ARTIST_BLOCK.LINK).attributes.href.match(link_template)[1]
        };
    }

    builder (response) {
        if (typeof response === "object") {
            response = response.payload[1][2].join("");
        }

        return HTMLParser.parse(response).querySelectorAll(".audio_block_small_item--artist")
            .map(block => this.buildBlock(block));
    }

    payload (response) {
        const payload = response?.payload?.[1]?.[0];

        return {
            ...payload,
            more: this.parseMore(payload)
        };
    }
}

module.exports = ArtistsStatic;