# [EasyVK-Audio] Changelog

## 1.2.0

**BREAKING CHANGES**:

* You must play all audios with [hls.js](https://github.com/video-dev/hls.js/)
* m3u8 module renamed to hls. To download audio you must use ```API.hls.download(...args)```. See updated [README.md](https://github.com/PurpleHorrorRus/EasyVK-AudioAPI/blob/meridius/README.md) for more details and see jest test file

**Other**:

* Improve code quality of HTTP module