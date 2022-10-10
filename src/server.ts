import path from 'path';
import express from 'express';

(function () {
    const app = express();
    const port = 3000;

    const staticPath = path.join(__dirname, './public');
    app.use(express.static(staticPath));

    app.get('/', (req: express.Request, res: express.Response) => {
        res.sendFile(path.join(__dirname, './page/index.html'))
    });

    app.listen(port, () => {
        console.log(`Listening on port ${port}`)
    });
})();