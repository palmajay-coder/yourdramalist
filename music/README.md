# Wrapped soundtrack

Four looping tracks play behind MyDramaList Wrapped, one per page load in turn (the page remembers the last one in
`ydl-wrapped-track` and plays the next). Each was re-encoded to 128 kbps from the original upload, which looks like a
Pixabay Music file by "ultrafi":

1. `wrapped-music-v2-1.mp3`: "ultrafi-neon-dreams-chill-k-pop-lofi-background-music-476585"
2. `wrapped-music-v2-2.mp3`: "ultrafi-busan-breeze-peaceful-k-pop-lofi-for-work-476580"
3. `wrapped-music-v2-3.mp3`: "ultrafi-cafe-soft-lofi-k-pop-instrumental-476582"
4. `wrapped-music-v2-4.mp3`: "ultrafi-ning-in-myeongdong-calm-lofi-k-pop-beats-476578" (the original single track)

BEFORE GOING LIVE: confirm the license on those tracks' pages allows use in an app/website, and save the license text or a
screenshot of the page here (e.g. `music/license.png`).

Where they are served from: the `assets/wrapped-music-v2-<n>.mp3` objects in the Worker's R2 bucket (`BLOBS`), at
`/assets/wrapped-music-v2-<n>.mp3` (`wrappedMusic.ts`). Upload with:
`npx wrangler r2 object put <bucket>/assets/wrapped-music-v2-<n>.mp3 --file music/wrapped-music-v2-<n>.mp3 --content-type audio/mpeg --remote`
Both buckets (`ydl-discover-preview-data` and `ydl-data`) have all four. A new track needs a new file name (the files are cached for a year).
