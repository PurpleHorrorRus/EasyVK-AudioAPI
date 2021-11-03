# [EasyVK-Audio] Changelog 1.5.x

## 1.5.0

**BREAKING CHANGES**

* Two-factor authentication now provides with hash and without checkCodeUrl link.
* To solve the captcha, now you only need sid and code.

**Changes**

* Fix: HTTP login. Login with desktop page instead of mobile.
* If you use ```javascript search.morePlaylists()``` request, this will return withMore object.