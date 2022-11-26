const Static = require("../static");

const oldRegex = /data-audio=\"(.*?)\" on/;

class AudioStatic extends Static {
    constructor (client, params) {
        super(client, params);
    }

    additional (audio, field) {
        return audio ? { [field]: audio } : {};
    }

    builderHTML (html) {
        // Regex don't work as variables

        const useRegex = oldRegex.test(html)
            ? /data-audio=\"(.*?)\" on/g
            : /data-audio=\"(.*?)\" data/g;

        const match = html.matchAll(useRegex);
        return Array.from(match, ([, object]) => {
            const unescaped = this.unescape(object);
            return JSON.parse(unescaped);
        });
    }

    getAdditionalInfo (audio = []) {
        const additional = {
            ...this.additional(audio[this.AudioObject.AUDIO_ITEM_INDEX_MAIN_ARTISTS], "artists"),
            ...this.additional(audio[this.AudioObject.AUDIO_ITEM_INDEX_FEAT_ARTISTS], "feat"),
            ...this.additional(audio[this.AudioObject.AUDIO_ITEM_INDEX_CHART], "chart"),
            ...this.additional(audio[this.AudioObject.AUDIO_ITEM_INDEX_LYRICS], "lyrics_id")
        };

        additional.artists?.forEach(artist => artist.name = this.unescape(artist.name));
        additional.feat?.forEach(artist => artist.name = this.unescape(artist.name));

        return additional;
    }

    async parseAudios (list, params = {}) {
        return params.raw
            ? this.getRawAudios(list)
            : await this.parse(list, params);
    }

    getRawAudios (audios) {

        /*
            A function that returns audio as objects from its ids without URLs
            You can use parse(array) manually when it requires
        */

        return audios.map(a => ({
            raw: a,
            ...this.getAudioAsObject(a)
        }));
    }

    getAudioObject (audio = {}) {
        return {
            access_key: audio.accessKey,
            action_hash: audio.actionHash,
            add_hash: audio.addHash,
            album_id: audio.album_id,
            album_part_number: audio.album_part_number,
            performer: this.unescape(audio.artist),
            context: audio.context,
            coverUrl_p: audio.coverUrl,
            coverUrl_s: audio.coverUrl,
            delete_hash: audio.deleteHash,
            duration: audio.duration,
            edit_hash: audio.editHash,
            id: audio.id,
            full_id: `${audio.owner_id}_${audio.id}`,
            is_explicit: audio.isExplicit,
            owner_id: audio.owner_id,
            replace_hash: audio.replaceHash,
            restore_hash: audio.restoreHash,
            is_restriction: audio.restrictionStatus,
            subtitle: this.unescape(audio.subtitle),
            title: this.unescape(audio.title),
            track_code: audio.trackCode,
            url: audio.url,
            url_hash: audio.urlHash
        };
    }

    getAudioAsObject (audio = []) {
        if (!Array.isArray(audio)) {
            return this.getAudioObject(audio);
        }

        const source = audio[this.AudioObject.AUDIO_ITEM_INDEX_URL]
            ? this.ExposeSource(audio[this.AudioObject.AUDIO_ITEM_INDEX_URL])
            : "";

        const e = (audio[this.AudioObject.AUDIO_ITEM_INDEX_HASHES] || "").split("/"),
            c = (audio[this.AudioObject.AUDIO_ITEM_INDEX_COVER_URL] || ""),
            cl = c.split(",");

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
            ...this.getAdditionalInfo(audio)
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