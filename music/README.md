# Wrapped soundtrack

`wrapped-music-v1.mp3` is the looping track behind MyDramaList Wrapped (re-encoded to 128 kbps from the original upload,
"ultrafi-ning-in-myeongdong-calm-lofi-k-pop-beats-476578.mp3", which looks like a Pixabay Music file).

BEFORE GOING LIVE: confirm the license on that track's page allows use in an app/website, and save the license text or a
screenshot of the page here (e.g. `music/license.png`).

Where it is served from: the `assets/wrapped-music-v1.mp3` object in the Worker's R2 bucket (`BLOBS`), at
`/assets/wrapped-music-v1.mp3`. Upload with:
`npx wrangler r2 object put <bucket>/assets/wrapped-music-v1.mp3 --file music/wrapped-music-v1.mp3 --content-type audio/mpeg --remote`
(test bucket `ydl-discover-preview-data` is done; the live bucket `ydl-data` is not, until live deploy is approved).
