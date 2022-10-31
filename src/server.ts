import path from 'path';
import express from 'express';
import { getMetadata } from './download';
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
        metadata.formats.forEach(elem => {
            if (elem.qualityLabel !== null && !videoResolutions.some(i => {return i.resolution === elem.qualityLabel && i.format === elem.container})) {
                videoResolutions.push({ resolution: elem.qualityLabel, format: elem.container });
            }
        });

        const obj = Object.assign({}, videoResolutions);
        res.status(200).json(obj);
    });

    app.listen(port, () => {
        console.log(`Server has started on port: ${port}`);
    });

    open("http://localhost:3000");
})();