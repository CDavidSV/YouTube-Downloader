import cp from 'child_process';
import ytdl from 'ytdl-core';
import ffmpeg from 'ffmpeg-static';
import fs from 'fs'
import { Readable, Writable } from 'stream';

let fileIndexes: string[] = [];

type videoFile = { fileName: string | null, finalReadable: Readable };
type formats = 'mp4' | 'webm';

/**
 * 
 * @param index file index
 * @param name file name
 */
function deleteFile( name: string | null) {
    if (!name) return;
    fs.unlink(`./downloads/${name}`, () => {}); // Didn't really know how to manage temporary stored videos so I did this.
    fileIndexes.splice(fileIndexes.indexOf(name), 1);
}

/**
 * Merges video and audio streams.
 * @param video Readable video stream
 * @param audio Readable audio stream
 * @param title Video Title
 * @returns ffmpeg Child Process
 */
function mergeAudioAndVideo(video: Readable, audio: Readable, fileName: string) {
    const ffmpegProcess = cp.spawn(ffmpeg as string, [
        '-i', `pipe:3`,
        '-i', `pipe:4`,
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-crf', '17',
        '-preset', 'veryfast',
        '-f', 'mp4',
        `./downloads/${fileName}`
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

    return ffmpegProcess;
}

/**
 * Get video information.
 * @param url video url
 * @returns Video info and metadata
 */
async function getMetadata(url: string) {
    const info = await ytdl.getInfo(url).catch(err => { });

    return info;
}

/**
 * Downloads both video and audio streams and merges them together using ffmpeg. Only works with mp4 for the moment.
 * It does this by creating a temp file where ffmpeg merges video and audio streams (This file then has to be deleted).
 * @param url video url
 * @param itag valid youtube itag
 * @param format can be mp4, webm or mp3
 * @returns VideoFile type with readable video stream
 */
async function downloadMergedVideo(url: string, itag: number, format: formats) {
    let downloadProgress: any;

    const videoStream = ytdl(url, { quality: itag, highWaterMark: 1 << 25 }).on('error', (err) => {
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
    
    const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
        
    // Creates a temprary file to merge video and audio, which then gets sent to the user and deleted.
    let fileNum = 1;
    let fileName = `temp${fileNum}.mp4`;
    while (fileIndexes.includes(fileName) || fs.existsSync(`./downloads/${fileName}`)) {
        if(!fileIndexes.includes(fileName) && fs.existsSync(`./downloads/${fileName}`)) {
            fileIndexes.push(fileName);
        } 
        fileNum++;
        fileName = `temp${fileNum}.mp4`;
    }
    fileIndexes.push(fileName);
    
    await new Promise<void>((resolve) => {
        mergeAudioAndVideo(videoStream, audioStream, fileName)
        .on('close', () => {
          resolve();
        })
    }) 

    let final: Readable = videoStream;
    audioStream.destroy();
    videoStream.destroy();
    final = fs.createReadStream(`./downloads/${fileName}`);

    return { fileName: fileName, finalReadable: final} as videoFile;
}

function downloadVideo(url: string, itag: number) {
    let downloadProgress: any;
    
    const videoStream = ytdl(url, { quality: itag, highWaterMark: 1 << 25 }).on('error', (err) => {
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

    return videoStream;
}

/**
 * 
 * @param url Video url
 * @returns Readable audio stream
 */
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
    progressBar += `] ${progress}%`;

    return progressBar;
}

export {
    getMetadata,
    downloadVideo,
    downloadMergedVideo,
    downloadAudioOnly,
    deleteFile,
    formats,
    videoFile,
}