const HTMLParser = require("node-html-parser");

const cover_template = /background-image: url\((.*?)\)/;
const link_template = /href=\"\/artist\/(.*?)\?/;

module.exports = {
    buildBlock (block) {
        const title = block.structuredText;
        const inner = block.innerHTML;
        const cover = cover_template.test(inner) ? inner.match(cover_template)[1] : "";
        const link = inner.match(link_template)[1];
        return { title, cover, link };
    },

    build (html) {
        const root = HTMLParser.parse(html);
        const blocks = root.querySelectorAll(".audio_block_small_item");

        return blocks.map(block => {
            try { return this.buildBlock(block); } 
            catch (e) { return null; }
        }).filter(artist => artist !== null);
    }
};