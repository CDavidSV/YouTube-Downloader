import path, { format } from 'path';
import express from 'express';
import { getMetadata, downloadVideo } from './download';
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
        const { parcel } = req.body;
        if (!parcel) {
            return res.status(400).send({ status: 'failed' });
        }
        const metadata = await getMetadata(parcel);

        let videoResolutions: { resolution: string, format: string }[] = [];
        metadata.formats.forEach(format => {
            if (format.qualityLabel !== null && !videoResolutions.includes({ resolution: format.qualityLabel, format: format.container })) {
                videoResolutions.push({ resolution: format.qualityLabel, format: format.container });
            }
        });
        res.status(200).json(JSON.stringify(videoResolutions));

        console.log(videoResolutions);
    });

    app.listen(port, () => {
        console.log(`Server has started on port: ${port}`);
    });

    open("http://localhost:3000");
})();