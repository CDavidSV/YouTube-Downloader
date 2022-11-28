import cp from 'child_process';
import ytdl from 'ytdl-core';
import ffmpeg from 'ffmpeg-static';
import { Readable, Stream, Writable } from 'stream';
import fluentFfmpeg, { FfmpegCommand } from 'fluent-ffmpeg';

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
fluentFfmpeg.setFfmpegPath(ffmpegPath);

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

function downloadVideo(url: string, itag: number) {
    const videoStream = ytdl(url, { quality: itag, dlChunkSize: 0, highWaterMark: 1 << 25 }).on('error', (err) => {
        console.log(err);
        return;
    });

    let final: Readable = videoStream;

    // Video and audio itags.
    const DASHaudio = [140, 251, 250, 249, 22, 139, 141, 249, 250, 251, 256, 258, 327, 338];
    if (!DASHaudio.includes(itag)) {
        const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
        const mergedVideo = mergeAudioAndVideo(videoStream, audioStream);
        final = mergedVideo;
    }

    //const convertedStream = fluentFfmpeg({ source: final })
    //.toFormat('mp4');
    //.save(`./downloads/lil.mp4`);
    return final;
}

function downloadAudioOnly(url: string) {
    const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });

    return audioStream;
}

export {
    getMetadata,
    downloadVideo,
    downloadAudioOnly
}