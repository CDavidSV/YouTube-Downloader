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
function sendFile(res: any, readable: Readable, size: number, fileName: string | null = null) {
    if (res.destroyed) { // Deletes file and destroys stream if connection is lost
        readable.destroy();
        if (fileName) deleteFile(fileName);
        return;
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', size);
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

        if (metadata.status == 'failed') {
            return res.status(200).send({ status: 'failed', error: metadata.error });
        };

        let videoResolutions: { resolution: string, hasAudio: boolean, format: string, itag: number, size: string, url: string }[] = [];
        metadata.data.formats.forEach((elem: any) => {
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
            title: metadata.data.videoDetails.title,
            author: metadata.data.videoDetails.author.name,
            authorURL: metadata.data.videoDetails.author.channel_url,
            duration: metadata.data.videoDetails.lengthSeconds,
            thumbnail: metadata.data.videoDetails.thumbnails[0].url,
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
        if (format == 'mp3') {
            const audio = await downloadAudioOnly(url);
            sendFile(res, audio.finalReadable, audio.size, audio.fileName);
        } else if (format == 'mp4') {
            videoAndAudio = await downloadMergedVideo(url, parseInt(itag), format);
            sendFile(res, videoAndAudio.finalReadable, videoAndAudio.size, videoAndAudio.fileName);
        } else {
            const videoOnly = await downloadVideo(url, parseInt(itag));
            sendFile(res, videoOnly.stream, videoOnly.size);
        }
    });

    app.listen(port, () => {
        console.log(`Server has started on port: ${port}`);
    });

    open("http://localhost:3000");
})();