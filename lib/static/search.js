const HTMLParser = require("node-html-parser");

const Static = require("../static");

class SearchStatic extends Static {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
    }

    builder (html) {
        const root = HTMLParser.parse(html);

        let a_objects = root.querySelectorAll(this.classes.AUDIO.ROW);

        if (!a_objects.length) {
            a_objects = root.querySelectorAll(this.classes.AUDIO.ITEM);
        }

        try {
            return a_objects.map(a => JSON.parse(a.attributes[this.classes.AUDIO.ATTRIBUTE]));
        } catch (e) {
            return a_objects.map(a => {
                const [, json] = a.rawAttrs.match(/data-audio=\"(.*?false])\"/);
                return JSON.parse(json);
            });
        }     
    }
}

module.exports = SearchStatic;