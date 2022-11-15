import ytdl from 'ytdl-core';
import fluentFfmpeg from 'fluent-ffmpeg';

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
fluentFfmpeg.setFfmpegPath(ffmpegPath);

const audioStream = ytdl('https://www.youtube.com/watch?v=kHTHVtwjKQo', { filter: 'audioonly', quality: 'highestaudio' });

fluentFfmpeg({ source: audioStream }).toFormat('mp3').save(`./downloads/audio.mp3`);