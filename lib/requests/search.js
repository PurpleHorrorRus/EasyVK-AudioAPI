const HTMLParser = require("node-html-parser");
const Promise = require("bluebird");

const Static = require("../static");

const AudioRequests = require("./audio");
const PlaylistsStatic = require("../static/playlists");
const ArtsistsStatic = require("../static/artists");

class SearchRequests extends Static {
    constructor (client) {
        super(client);
        this.audio = new AudioRequests(client);
        this.PlaylistsStatic = new PlaylistsStatic(client);
    }

    query (params = {}) {

        /*
            q: string
        */

        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            if (!params.q) {
                return reject(new Error("You must to specify search value"));
            }

            const res = await this.request({
                act: "section",
                al: 1,
                claim: 0,
                is_layer: 0,
                owner_id: uid,
                q: params.q,
                section: "search"
            });

            const html = res.payload[1][0];
            const payload = res.payload[1][1];
            const section_id = payload.sectionId;
            const start_from = payload.next_from || payload.nextFrom;

            const list = payload.playlist.list || payload.playlistData.list || [];
            let audios = [];

            if (list && list.length) {
                audios = params.raw 
                    ?  this.audio.getRawAudios(list)
                    : await this.audio.getNormalAudios(list);
            }
            
            const artists = ArtsistsStatic.build(html);
            const playlists = this.PlaylistsStatic.build(html);

            const more = { section_id, start_from };

            return resolve({ 
                audios, 
                playlists, 
                artists, 
                more 
            });
        });
    }

    withMore (params = {}) {
        
        /*
            more: object (from search())
        */

        return new Promise(async (resolve, reject) => {
            if (!params.more) {
                return reject(new Error("Pass a valid \"more\" object"));
            }
            
            const more = params.more;
            if (!more.section_id.length || !more.start_from.length) {
                return reject(new Error("Pass a valid \"more\" object"));
            }

            const res = await this.request({
                act: "load_catalog_section",
                al: 1,
                section_id: more.section_id,
                start_from: more.start_from
            });

            const payload = res.payload[1][1];

            const section_id = payload.sectionId;
            const start_from = payload.next_from || payload.nextFrom;
            
            const list = payload.playlist.list || payload.playlists[0].list;

            const audios = params.raw
                ? list
                : await this.audio.getNormalAudios(list); 
            
            const _more = { section_id, start_from };

            return resolve({ audios, more: _more });
        });

    }

    more (url, params = {}) {
        const { url: form_url, offset, cursor } = params;
        if (!url || !url.length) {
            url = form_url;
        }
        
        return new Promise(async (resolve, reject) => {
            url = url.toLowerCase();
            const { data } = await this.request({
                url: form_url,
                _ajax: 1,
                offset, 
                next_from: cursor
            }, true, true, url);

            if (!data[0]) {
                return reject(new Error("more error"));
            }

            const [objects] = data;
            const values = Object.values(objects);
            const map = values.map(v => v[1]);
            const audios = params.raw 
                ? this.audio.getRawAudios(map) 
                : await this.audio.getNormalAudios(map);

            return resolve({
                list: audios,
                next: data[2] || null
            });
        });
    }

    async morePlaylists (url, params = {}) {
        const { url: form_url, offset, cursor } = params;
        if (!url || !url.length) {
            url = form_url;
        }

        const classes = {
            link: ".audioPlaylistsPage__itemLink",
            title: ".audioPlaylistsPage__title",
            cover: ".audioPlaylistsPage__cover",
            subtitle: ".audioPlaylistsPage__author",
            stats: ".audioPlaylistsPage__stats"
        };

        return new Promise(async resolve => {
            url = url.toLowerCase();
            const { data, next }  = await this.request({
                url: form_url,
                _ajax: 1,
                offset, 
                next_from: cursor
            }, true, true, url);

            const [pl_objects] = data;
        
            const playlists = Object.values(pl_objects).map(
                p => {
                    const object = HTMLParser.parse(p[1]);
                    return this.PlaylistsStatic.buildPlaylistsMobile(object, classes);
                });
            
            return resolve({
                list: playlists,
                next: next || null
            });
        });
    }

    async hints (params = {}) {
        if (!params.q) {
            return;
        }
        
        return new Promise(async (resolve, reject) => {
            const res = await this.request({
                act: "a_gsearch_hints",
                al: 1,
                q: params.q,
                section: "audio"
            }, true, false, "hints.php").catch(reject);

            try {
                const payload = res.payload[1][0];

                if (!payload) {
                    return reject(new Error("Search hints is broken"));
                }

                const map = payload.map(r => [ r[1], r[3] ]);
                return resolve(map);
            }
            catch(e) { 
                return resolve([]); 
            }
        });
    }

    inAudios (params) {

        /*
            q: string
            owner_id: number
            count?: number
        */
        
        return new Promise(async (resolve, reject) => {
            if (!params.q) {
                return reject(new Error("You must to specify query for search"));
            }

            const owner_id = Number(params.owner_id) || this.user_id;

            const res = await this.request({
                act: "section",
                al: 1,
                claim: 0,
                is_layer: 0,
                owner_id,
                q: params.q,
                section: "search"
            }).catch(reject);
            
            const html = res.payload[1][0];
            let matches = this.getAudiosFromHTML(html);
            matches = matches.filter(a => Number(a[1]) === owner_id);

            if (params.count) {
                matches = matches.splice(0, params.count);
            }

            const audios = params.raw 
                ? this.audio.getRawAudios(matches) 
                : await this.audio.getNormalAudios(matches);

            return resolve({ 
                list: audios, 
                _q: params.q 
            });
        });
    }

    getByBlock (params = {}) {

        /*
            block: string
            count?: number - By default, ALL audios are returned
        */

        return new Promise(async (resolve, reject) => {
            if (!params.block) {
                return reject(new Error("You must to specify type"));
            }

            const res = await this.request({
                block: params.block,
                section: params.section || "recoms"
            }).catch(reject);

            let list = this.getAudiosFromHTML(res);

            if (!params.count) {
                params.raw = true;
                let [, section_id, start_from] = res.match(/data-id='(.*?)' data-next='(.*?)'/);

                while (section_id.length && start_from.length) {
                    const { audios, more } = await this.withMore({
                        normalize: false,
                        raw: true,
                        more: {
                            section_id,
                            start_from
                        }
                    });
                    
                    list = [...list, ...audios];
                    section_id = more.section_id;
                    start_from = more.start_from;
                }
            } else {
                list = list.splice(0, params.count);
            }
            
            const audios = params.raw 
                ? this.audio.getRawAudios(list)
                : await this.audio.getNormalAudios(list);
                
            return resolve(audios);
        });
    }
}

module.exports = SearchRequests;