import path from 'path';
import express from 'express';
import { deleteFile, downloadAudioOnly, downloadMergedVideo, downloadVideo, getMetadata, videoFile } from './download';
import open from 'open';
import { Readable } from 'stream';

/*
    Sends video and deletes it afterward.
    If the video is merged with audio it will create a temporary file that will be deleted afterwards.
    If the video is not merged with audio or it's just an audio file, it will be directly sent without any temp file.
*/ 
function sendReadable(res: any, readable: Readable, fileName: string | null = null) {
    if (res.destroyed) { // Deletes file and destroys stream if connection is lost
        readable.destroy();
        if (fileName) deleteFile(fileName);
        return;
    }
    readable.pipe(res, { end: true }).once("close", function () {
        readable.destroy(); // make sure the stream is closed, don't close if the download aborted.
        if (fileName) deleteFile(fileName);
    });
}

(function () {
    const app = express();
    const port = 3000;

    const staticPath = path.join(__dirname, './public');
    app.use(express.static(staticPath));
    app.use(express.json());

    app.get('/', (req: express.Request, res: express.Response) => {
        res.sendFile(path.join(__dirname, './page/index.html'));
    });

    app.post('/search', async (req, res, next) => {
        const { queryUrl } = req.body;
        if (!queryUrl) {
            return res.status(400).send({ status: 'failed' });
        }
        const metadata = await getMetadata(queryUrl);

        if (!metadata) {
            return res.status(200).send({ status: 'failed' });
        };

        let videoResolutions: { resolution: string, hasAudio: boolean, format: string, itag: number, size: string, url: string }[] = [];
        metadata.formats.forEach(elem => {
            if (elem.qualityLabel !== null && elem.qualityLabel && elem.container && (elem.contentLength || elem.itag == 18 || elem.itag == 22)) {
                let audio: boolean ;
                if (elem.container != 'webm' || elem.hasAudio == true) {
                    audio = true;
                } else {
                    audio = false
                }

                videoResolutions.push({ resolution: elem.qualityLabel, hasAudio: audio, format: elem.container, itag: elem.itag, size: elem.contentLength, url: elem.url });
            }
        });

        const videoObj: {
            title: string,
            author: string,
            authorURL: string,
            duration: string,
            thumbnail: string,
            container: any,
            videoURL: string,
        } = {
            title: metadata.videoDetails.title,
            author: metadata.videoDetails.author.name,
            authorURL: metadata.videoDetails.author.channel_url,
            duration: metadata.videoDetails.lengthSeconds,
            thumbnail: metadata.videoDetails.thumbnails[0].url,
            container: Object.assign({}, videoResolutions),
            videoURL: queryUrl,
        };
        res.status(200).json(videoObj);
    });

    app.post('/download', async (req, res, next) => {
        // Get resolution and format options.
        const { resolution } = req.body;
        const { format } = req.body;
        const { itag } = req.body;
        const { url } = req.body;

        if (!resolution || !format || !itag || !url) {
            return res.status(400).send({ status: 'failed' });
        }
        let videoAndAudio: videoFile;
        let videoOnly: Readable;
        let audio: Readable;
        if (format == 'mp3') {
            audio = downloadAudioOnly(url);
            sendReadable(res, audio);
        } else if (format == 'mp4') {
            videoAndAudio = await downloadMergedVideo(url, parseInt(itag), format);
            sendReadable(res, videoAndAudio.finalReadable, videoAndAudio.fileName);
        } else {
            videoOnly = downloadVideo(url, parseInt(itag));
            sendReadable(res, videoOnly);
        }
    });

    app.listen(port, () => {
        console.log(`Server has started on port: ${port}`);
    });

    open("http://localhost:3000");
})();