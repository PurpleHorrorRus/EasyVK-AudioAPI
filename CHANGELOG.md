# [EasyVK-Audio] Changelog

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