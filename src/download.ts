import cp from 'child_process';
import ytdl from 'ytdl-core';
import ffmpeg from 'ffmpeg-static';
import fs from 'fs'
import { Readable, Writable } from 'stream';

let fileIndexes: number[] = [];

type videoFile = {fileIndex: number, fileName: string, finalReadable: Readable};
type formats = 'mp4' | 'webm';

/**
 * 
 * @param index file index
 * @param name file name
 */
function deleteFile(index: number, name: string) {
    fs.unlink(`./downloads/${name}`, () => {});
    fileIndexes.splice(fileIndexes.indexOf(index), 1);
}
/**
 * Merges video and audio streams.
 * @param video Readable video stream
 * @param audio Readable audio stream
 * @param title Video Title
 * @returns ffmpeg Child Process
 */
function mergeAudioAndVideo(video: Readable, audio: Readable, title: string) {
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
        `./downloads/${title}`
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
 * 
 * @param url video url
 * @param itag valid youtube itag
 * @param format can be mp4, webm or mp3
 * @returns VideoFile type with readable video stream
 */
async function downloadVideo(url: string, itag: number, format: formats) {
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

    let fileNum = 1;
    let fileName = `temp${fileNum}.mp4`;
    if (itag !== 18 && itag !== 22 && format !== 'webm') {
        const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
        while (fileIndexes.includes(fileNum) || fs.existsSync(`./downloads/${fileName}`)) {
            if(!fileIndexes.includes(fileNum)) {
                fileIndexes.push(fileNum);
            } else if (fileIndexes.includes(fileNum) && !fs.existsSync(`./downloads/${fileName}`)) {
                fileIndexes.splice(fileIndexes.indexOf(fileNum), 1);
            }
            fileNum++;
            fileName = `temp${fileNum}.mp4`;
        }
        fileIndexes.push(fileNum);
        
        await new Promise<void>((resolve) => { // wait
            mergeAudioAndVideo(videoStream, audioStream, fileName)
            .on('close', () => {
              resolve(); // finish
            })
        })
        final = fs.createReadStream(`./downloads/${fileName}`);
    }

    return { fileIndex: fileNum, fileName: fileName, finalReadable: final} as videoFile;
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
    progressBar += ` ] ${progress}%`;

    return progressBar;
}

// test
// downloadVideo('https://www.youtube.com/watch?v=QjCkFem2y0U', 137);

export {
    getMetadata,
    downloadVideo,
    downloadAudioOnly,
    deleteFile,
    formats,
    videoFile,
}