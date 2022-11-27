```
Latest Breaking Changes: 2.0.0
```

## Params object

| Property | Default value | Description |
| :-----   |   :--:   |   :------   |
| ffmpeg |  | ```Required.``` Path to FFmpeg executable |
| output | ```./output``` | The folder where audio will be saved after processing |
| chunks | ```./hls_{randomInt}``` | The folder where the audio parts will be downloaded |
| delete       | ```true``` | Resolve buffer and delete .mp3 file after processing |
| onProgress   | ```(percent) => (false)``` | Function that calling during audio downloading |
| onProcessing | ```() => (false)``` | Function that calling after downloading when processing started |

## Downloading audio

```javascript
const params = {
    ffmpeg: "./ffmpeg.exe",
    output: "./output",
    chunks: "./hls",
    delete: false,

    onProgress: percent => { // Track downloading progress
        percent = Math.round(percent);
        console.log(`Downloading Progress: ${percent}%`);
    },

    onProcessing: () => { // Finish downloading, start processing with FFmpeg
        console.log("Processing...");
    }
};

const { audios } = await API.audio.get({ count: 1});
const output = await audios[0].download({
    ...params,
    name: `${audios[0].performer} - ${audios[0].title}`,
});

console.log(`${audio[0].performer} - ${audio[0].title} has been downloaded to: ${output}`);
```

## Downloading audio using independent instance

```javascript
const params = {
    ffmpeg: "./ffmpeg.exe",
    output: "./output",
    chunks: "./hls",
    delete: false,

    onProgress: percent => { // Track downloading progress
        percent = Math.round(percent);
        console.log(`Downloading Progress: ${percent}%`);
    },

    onProcessing: () => { // Finish downloading, start processing with FFmpeg
        console.log("Processing...");
    }
};

const { audios } = await API.audio.get({ count: 1 });
const output = await new API.DownloadInstance(audios[0], {
    ...params,
    name: `${audios[0].performer} - ${audios[0].title}`,
}).download();

console.log(`${audio[0].performer} - ${audio[0].title} has been downloaded to: ${output}`);
```