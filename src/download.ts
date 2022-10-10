import cp from 'child_process';
import ytdl from 'ytdl-core';
import ffmpeg from 'ffmpeg-static';
import { Readable, Writable } from 'stream';
import fluentFfmpeg from 'fluent-ffmpeg';

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
fluentFfmpeg.setFfmpegPath(ffmpegPath);

const url = 'https://www.youtube.com/watch?v=TWAPqCbPfiU'; // Url goes here.

// Merges video and audio streams.
function mergeAudioAndVideo(video: Readable, audio: Readable, name: string) {
    let ffmpegProcess = cp.spawn(ffmpeg as string, [
        '-loglevel', '8', '-hide_banner',
        '-i', 'pipe:3', '-i', 'pipe:4',
        '-map', '0:a', '-map', '1:v',
        '-c', 'copy',
        '-f', 'matroska', 'pipe:5'
    ], {
        windowsHide: true,
        stdio: [
            'inherit', 'inherit', 'inherit',
            'pipe', 'pipe', 'pipe'
        ]
    });

    // When merging is completed.
    ffmpegProcess.on('close', () => {
        console.log("Merging Completed!");
    });

    // Pipe audio and video to merge them using ffmpeg.
    audio.pipe(ffmpegProcess.stdio[3] as Writable);
    video.pipe(ffmpegProcess.stdio[4] as Writable);

    // Change the format to mp4 and save the file.
    fluentFfmpeg({ source: ffmpegProcess.stdio[5 as any] as Readable }).toFormat('mp4').save(`./downloads/${name}.mp4`);
}

async function downloadVideo(url: string) {
    // Get video info.
    const info = await ytdl.getInfo(url);
    let downloadProgress: number;

    const audioStream = ytdl.downloadFromInfo(info, { filter: 'audioonly', quality: 'highestaudio' });
    const videoStream = ytdl.downloadFromInfo(info, { quality: 'highestvideo' }).on('progress', (length, downloaded, totallength) => {
        // Calculate download progress.
        const downloadedProgress = Math.round(downloaded * 100 / totallength);
        if (downloadProgress !== downloadedProgress) {
            downloadProgress = downloadedProgress;
            console.clear();
            const completion = progressBar(downloadProgress);
            console.log(completion);
        }
    });

    mergeAudioAndVideo(videoStream, audioStream, info.videoDetails.title);
}

function progressBar(progress: number) {
    let progressBar: string = 'Downloading Video: \n [';

    const total = 60;
    for (let i = 0; i < total; i++) {
        if (i < progress * total / 100) {
            progressBar += '▮';
        } else {
            progressBar += ' ';
        }
    }
    progressBar += ` ] ${progress}%`;

    return progressBar;
}

downloadVideo(url);