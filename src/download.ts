import cp from 'child_process';
import ytdl from 'ytdl-core';
import ffmpeg from 'ffmpeg-static';
import { Readable, Writable } from 'stream';
import fluentFfmpeg from 'fluent-ffmpeg';

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
fluentFfmpeg.setFfmpegPath(ffmpegPath);

type ResolutionOptions = "2160p" | "1440p" | "1080p" | "720p" | "480p" | "360p" | "240p" | "144p";
type FormatOptions = "mp4" | "webm";

// Merges video and audio streams.
function mergeAudioAndVideo(video: Readable, audio: Readable) {
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

    // Return the merged stream.
    return ffmpegProcess.stdio[5 as any] as Readable;
}

async function getMetadata(url: string) {
    const info = await ytdl.getInfo(url).catch(err => { });

    return info;
}

async function downloadVideo(url: string, name: string, options: { resolution: ResolutionOptions, format: FormatOptions }) {
    // Get video info.
    let downloadProgress: number;

    switch (options.resolution) {

    }

    const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
    const videoStream = ytdl(url, { quality: 'highestvideo' }).on('progress', (length, downloaded, totallength) => {
        // Calculate download progress.
        const downloadedProgress = Math.round(downloaded * 100 / totallength);
        if (downloadProgress !== downloadedProgress) {
            downloadProgress = downloadedProgress;
            console.clear();
            const completion = progressBar(downloadProgress);
            console.log(completion);
        }
    });

    const mergedVideo = mergeAudioAndVideo(videoStream, audioStream);

    // Convert to valid format.
    if (options.format === 'mp4') {
        fluentFfmpeg({ source: mergedVideo }).toFormat('mp4').save(`./downloads/${name}.mp4`);
    } else {
        fluentFfmpeg({ source: mergedVideo }).toFormat('webm').save(`./downloads/${name}.mp4`);
    }
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

export {
    getMetadata,
    downloadVideo,
}