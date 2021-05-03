const HTMLParser = require("node-html-parser");
const Static = require("../static");

const cover_template = /background-image:\s?url\('?(.*?)'?\)/;
const link_template = /href=\"\/artist\/(.*?)\?/;

class ArtistsStatic extends Static {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
    }

    buildBlock (block) {
        return { 
            title: block.text.trim(), 
            cover: cover_template.test(block.innerHTML) ? block.innerHTML.match(cover_template)[1] : "", 
            link: block.innerHTML.match(link_template)[1]
        };
    }

    builder (html) {
        return HTMLParser.parse(html).querySelectorAll(".audio_block_small_item--artist").map(block => {
            try { return this.buildBlock(block); } 
            catch (e) { return null; }
        }).filter(artist => artist !== null);
    }
}

module.exports = ArtistsStatic;