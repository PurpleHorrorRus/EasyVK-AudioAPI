const Static = require("../static");

class AudioStatic extends Static {
    constructor (client, vk, params = {}) {
        super(client, vk, params);
    }

    additional (audio, field) {
        return audio ? { [field]: audio } : {};
    }

    builderHTML (html) {
        return Array.from(html.matchAll(/data-audio=\"(.*?)\" on/g))
            .map(([, a]) => JSON.parse(this.unescape(a)));
    }

    getAudioAsObject (audio = []) {
        const source = audio[this.AudioObject.AUDIO_ITEM_INDEX_URL]
            ? this.ExposeSource(audio[this.AudioObject.AUDIO_ITEM_INDEX_URL])
            : "";
    
        const e = (audio[this.AudioObject.AUDIO_ITEM_INDEX_HASHES] || "").split("/"),
            c = (audio[this.AudioObject.AUDIO_ITEM_INDEX_COVER_URL] || ""),
            cl = c.split(",");

        const additional = {
            ...this.additional(audio[this.AudioObject.AUDIO_ITEM_INDEX_MAIN_ARTISTS], "artists"),
            ...this.additional(audio[this.AudioObject.AUDIO_ITEM_INDEX_FEAT_ARTISTS], "feat"),
            ...this.additional(audio[this.AudioObject.AUDIO_ITEM_INDEX_CHART], "chart"),
            ...this.additional(audio[this.AudioObject.AUDIO_ITEM_INDEX_LYRICS], "lyrics_id")
        };

        return {
            id: audio[this.AudioObject.AUDIO_ITEM_INDEX_ID],
            owner_id: audio[this.AudioObject.AUDIO_ITEM_INDEX_OWNER_ID],
            url: source || "",
            title: this.unescape(audio[this.AudioObject.AUDIO_ITEM_INDEX_TITLE]),
            performer: this.unescape(audio[this.AudioObject.AUDIO_ITEM_INDEX_PERFORMER]),
            duration: audio[this.AudioObject.AUDIO_ITEM_INDEX_DURATION],
            covers: c?.replaceAll("&amp;", "&"),
            is_restriction: audio[this.AudioObject.AUDIO_ITEM_INDEX_RESTRICTION],
            extra: audio[this.AudioObject.AUDIO_ITEM_INDEX_EXTRA],
            coverUrl_s: cl[0]?.replaceAll("&amp;", "&") || "",
            coverUrl_p: cl[1]?.replaceAll("&amp;", "&") || "",
            flags: audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS],
            hq: !!(audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS] & this.AudioObject.AUDIO_ITEM_HQ_BIT),
            claimed: !!(audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS] & this.AudioObject.AUDIO_ITEM_CLAIMED_BIT),
            uma: !!(audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS] & this.AudioObject.AUDIO_ITEM_UMA_BIT),
            album_id: audio[this.AudioObject.AUDIO_ITEM_INDEX_ALBUM_ID],
            full_id: `${audio[this.AudioObject.AUDIO_ITEM_INDEX_OWNER_ID]}_${audio[this.AudioObject.AUDIO_ITEM_INDEX_ID]}`,
            explicit: !!(audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS] & this.AudioObject.AUDIO_ITEM_EXPLICIT_BIT),
            subtitle: this.unescape(audio[this.AudioObject.AUDIO_ITEM_INDEX_SUBTITLE]),
            add_hash: e[0] || "",
            edit_hash: e[1] || "",
            action_hash: e[2] || "",
            delete_hash: e[3] || "",
            replace_hash: e[4] || "",
            can_edit: !!e[1],
            can_delete: !!e[3],
            can_add: !!(audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS] & this.AudioObject.AUDIO_ITEM_CAN_ADD_BIT),
            track_code: audio[this.AudioObject.AUDIO_ITEM_INDEX_TRACK_CODE],
            ads: audio[this.AudioObject.AUDIO_ITEM_INDEX_ADS],
            album: audio[this.AudioObject.AUDIO_ITEM_INDEX_ALBUM],
            replaceable: !!(audio[this.AudioObject.AUDIO_ITEM_INDEX_FLAGS] & this.AudioObject.AUDIO_ITEM_REPLACEABLE),
            context: audio[this.AudioObject.AUDIO_ITEM_INDEX_CONTEXT],
            ...additional
        };
    }

    getAdi (audio) {
        const adi = [audio[1], audio[0]],
            e = audio[13].split("/");
    
        const actionHash = e[2] || "",
            otherHash  = e[5] || "";

        if (!actionHash || !otherHash) {
            return null;
        }
    
        adi[2] = actionHash;
        adi[3] = otherHash;
    
        return adi;
    }
}

module.exports = AudioStatic;