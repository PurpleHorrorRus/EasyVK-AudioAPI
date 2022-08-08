const Static = require("../static");

class ArtistsStatic extends Static {
    constructor (client, vk) {
        super(client, vk);
    }

    formatArtist(artist) {
        return artist
            .replace(" ", "")
            .toLowerCase();
    }

    formatBlocks(response) {
        let collections = [];
        
        response.section.blocks.forEach((block, index) => {
            if (index === 0 || block.data_type === "none") {
                return false;
            }

            const collectionIndex = collections.push({
                id: block.id,
                title: response.section.blocks[index - 1].layout.title
            });
            
            const collection = collections[collectionIndex - 1];

            switch (block.data_type) {
                case "music_audios": {
                    collection.subtype = block.layout.name
                        .replace("music", "")
                        .replace(/(?!_)triple_stacked_slider/, "");

                    collection.data = response.audios.filter(audio => {
                        return block.audios_ids.includes(`${audio.owner_id}_${audio.id}`)
                    });
                    
                    break;
                }

                case "music_playlists": {
                    collection.data = response.playlists.filter(playlist => {
                        return block.playlists_ids.includes(`${playlist.owner_id}_${playlist.id}`)
                    });
                    
                    break;
                }

                case "links": {
                    collection.subtype = block.next_from || "";
                    collection.data = response.links.filter(link => {
                        return block.links_ids.includes(link.id);
                    });

                    break;
                }
            }
        });

        return collections;
    }
}

module.exports = ArtistsStatic;