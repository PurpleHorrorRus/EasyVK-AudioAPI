const HTMLParser = require("node-html-parser");

module.exports = {
    build (html) {
        let artists = [];

        const cover_template = /background-image: url\((.*?)\)/;
        const link_template = /href=\"\/artist\/(.*?)\?/;

        const root = HTMLParser.parse(html);
        const blocks = root.querySelectorAll(".audio_block_small_item");

        for (const block of blocks) {
            try {
                const title = block.structuredText;
                const inner = block.innerHTML;
                const cover = cover_template.test(inner) ? inner.match(cover_template)[1] : "";
                const link = inner.match(link_template)[1];
                artists = [...artists, { title, cover, link }];
            } catch (e) { continue; }
        }

        return artists;
    }
};