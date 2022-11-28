import path from 'path';
import express from 'express';
import { downloadAudioOnly, downloadVideo, getMetadata } from './download';
import open from 'open';

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

        let videoResolutions: { resolution: string, format: string, itag: number, url: string }[] = [];
        metadata.formats.forEach(elem => {
            if (elem.qualityLabel !== null && elem.qualityLabel && elem.container && (elem.contentLength || elem.itag == 18)) {
                videoResolutions.push({ resolution: elem.qualityLabel, format: elem.container, itag: elem.itag, url: elem.url });
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
        const { selectedOptions } = req.body;
        const { url } = req.body;

        if (!selectedOptions || !url) {
            return res.status(400).send({ status: 'failed' });
        }
        const options = selectedOptions;

        let download;
        if (options[1] == 'mp3') {
            download = downloadAudioOnly(url);
            download.pipe(res, { end: true });
        } else if (options[1] == 'mp4') {
            download = downloadVideo(url, options[2]);
            download.pipe(res, { end: true });
        } else {
            // Redirect.
            return res.status(400).send({ status: 'success' });
        }

    });

    app.listen(port, () => {
        console.log(`Server has started on port: ${port}`);
    });

    open("http://localhost:3000");
})();