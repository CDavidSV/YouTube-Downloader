import path from 'path';
import express from 'express';
import { deleteFile, downloadAudioOnly, downloadVideo, getMetadata, videoFile } from './download';
import open from 'open';
import { Readable } from 'stream';
import e from 'express';

(function () {
    const app = express();
    const port = 3000;

    const staticPath = path.join(__dirname, './public');
    app.use(express.static(staticPath));
    app.use(express.json());

    app.get('/', (req: express.Request, res: express.Response) => {
        res.sendFile(path.join(__dirname, './page/index.html'))
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

        let videoResolutions: { resolution: string, hasAudio: boolean, format: string, itag: number, url: string }[] = [];
        metadata.formats.forEach(elem => {
            if (elem.qualityLabel !== null && elem.qualityLabel && elem.container && (elem.contentLength || elem.itag == 18 || elem.itag == 22)) {
                let audio: boolean ;
                if (elem.container != 'webm') {
                    audio = true;
                } else {
                    audio = false
                }

                videoResolutions.push({ resolution: elem.qualityLabel, hasAudio: audio, format: elem.container, itag: elem.itag, url: elem.url });
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
        let downloadedVideo: videoFile;
        let downloadedAudio: Readable;
        if (format == 'mp3') {
            downloadedAudio = downloadAudioOnly(url);
            downloadedAudio.pipe(res, { end: true });
        } else if (format == 'mp4') {
            downloadedVideo = await downloadVideo(url, parseInt(itag), format) ;
            downloadedVideo.finalReadable.pipe(res, { end: true }).once("close", function () {
                downloadedVideo.finalReadable.destroy(); // make sure the stream is closed, don't close if the download aborted.
                deleteFile(downloadedVideo.fileIndex, downloadedVideo.fileName);
            });;
        } else {
            downloadedVideo = await downloadVideo(url, parseInt(itag), format);
            downloadedVideo.finalReadable.pipe(res, { end: true }).once("close", function () {
                downloadedVideo.finalReadable.destroy(); // make sure the stream is closed, don't close if the download aborted.
                deleteFile(downloadedVideo.fileIndex, downloadedVideo.fileName);
            });;
        }
    });

    app.listen(port, () => {
        console.log(`Server has started on port: ${port}`);
    });

    // open("http://localhost:3000");
})();