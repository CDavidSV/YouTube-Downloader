
import ytdl from 'ytdl-core';
(async function () {
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=hvX0maAJsnY').catch(err => { });
    console.log(info);

    //const audioStream = ytdl('https://www.youtube.com/watch?v=kHTHVtwjKQo', { filter: 'audioonly', quality: 'highestaudio' });

    //fluentFfmpeg({ source: audioStream }).toFormat('mp3').save(`./downloads/audio.mp3`);
})();