import ytdl from 'ytdl-core';
import fluentFfmpeg from 'fluent-ffmpeg';

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
fluentFfmpeg.setFfmpegPath(ffmpegPath);

(async function () {
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=5Cdh0KdFAcc').catch(err => { });
    console.log(info);

    //const audioStream = ytdl('https://www.youtube.com/watch?v=kHTHVtwjKQo', { filter: 'audioonly', quality: 'highestaudio' });

    //fluentFfmpeg({ source: audioStream }).toFormat('mp3').save(`./downloads/audio.mp3`);
})();
