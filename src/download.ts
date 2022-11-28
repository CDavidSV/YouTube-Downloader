import cp from 'child_process';
import ytdl from 'ytdl-core';
import ffmpeg from 'ffmpeg-static';
import { Readable, Writable } from 'stream';

// Merges video and audio streams.
function mergeAudioAndVideo(video: Readable, audio: Readable) {
    const ffmpegProcess = cp.spawn(ffmpeg as string, [
        '-i', `pipe:3`,
        '-i', `pipe:4`,
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'copy',
        '-c:a', 'libmp3lame',
        '-crf', '27',
        '-preset', 'veryfast',
        '-movflags', 'frag_keyframe+empty_moov',
        '-f', 'mp4',
        '-loglevel', 'error',
        '-'
    ], {
        stdio: [
            'pipe', 'pipe', 'pipe', 'pipe', 'pipe',
        ],
    });

    video.pipe(ffmpegProcess.stdio[3] as Writable);
    audio.pipe(ffmpegProcess.stdio[4] as Writable);

    // When merging is completed.
    ffmpegProcess.on('close', () => {
        console.log("Merging Completed!");
    });

    let ffmpegLogs = ''

    ffmpegProcess.stdio[2].on(
        'data',
        (chunk) => {
            ffmpegLogs += chunk.toString()
        }
    )

    ffmpegProcess.on(
        'exit',
        (exitCode) => {
            if (exitCode === 1) {
                console.error(ffmpegLogs)
            }
        }
    )

    // Return the merged stream.
    return ffmpegProcess.stdio[1] as Readable;
}

async function getMetadata(url: string) {
    const info = await ytdl.getInfo(url).catch(err => { });

    return info;
}

function downloadVideo(url: string, itag: number) {
    let downloadProgress: any;

    const videoStream = ytdl(url, { quality: itag }).on('error', (err) => {
        console.log(err);
        return;
    }).on('progress', (length, downloaded, totallength) => {
        // Calculate download progress.
        const downloadedProgress = Math.round(downloaded * 100 / totallength);
        if (downloadProgress !== downloadedProgress) {
            downloadProgress = downloadedProgress;
            console.clear();
            const completion = progressBar(downloadProgress);
            console.log(completion);
        }
    });

    let final: Readable = videoStream;

    if (itag != 18 && itag != 22) {
        const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
        const mergedVideo = mergeAudioAndVideo(videoStream, audioStream);
        final = mergedVideo;
    }

    return final;
}

function downloadAudioOnly(url: string) {
    let downloadProgress: any;
    const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' }).on('progress', (length, downloaded, totallength) => {
        // Calculate download progress.
        const downloadedProgress = Math.round(downloaded * 100 / totallength);
        if (downloadProgress !== downloadedProgress) {
            downloadProgress = downloadedProgress;
            console.clear();
            const completion = progressBar(downloadProgress);
            console.log(completion);
        }
    });

    return audioStream;
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
    downloadAudioOnly
}