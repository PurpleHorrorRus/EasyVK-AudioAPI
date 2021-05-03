const Static = require("../static");

class SearchStatic extends Static {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
    }
}

module.exports = SearchStatic;