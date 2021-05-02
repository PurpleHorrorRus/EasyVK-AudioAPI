# [EasyVK-Audio] Changelog

## 1.2.5

* Added ```feat``` field to song object
* Revert ```lyrics_id``` as a required field. Also for fields ```artists, fields, chart```

## 1.2.4

**BREAKING CHANGES**:

* Changes in ```artists.get``` request. Now you need pass artist endpoint as first argument and params as second. See updated README and unit tests.

## 1.2.3

* Add chart field to songs from VK Charts
* Fix for charts loading
* Now lyrics_id is always include in song object. Value 0 means there is no lyrics for song

## 1.2.2

* Add new API.playlists.getFromWall() request
* Fix playlists deleting

## 1.2.1

**BREAKING CHANGES**:

* Downloader module (hls) now working as separate part. Now you must manually import and create new instance. See updated [README.md](https://github.com/PurpleHorrorRus/EasyVK-AudioAPI/blob/meridius/README.md) for details
* Params for download also moved to instance constructor

**Other**:

* Added new params field: ```concurrency``` (default: 5). You can set the number of parallel downloads manually 
* Decryption key now storing in instance instead of chunks

## 1.2.0

**BREAKING CHANGES**:

* You must play all audios with [hls.js](https://github.com/video-dev/hls.js/)
* m3u8 module renamed to hls. To download audio you must use ```API.hls.download(...args)```. See updated [README.md](https://github.com/PurpleHorrorRus/EasyVK-AudioAPI/blob/meridius/README.md) for more details and see jest test file

**Other**:

* Improve code quality of HTTP module