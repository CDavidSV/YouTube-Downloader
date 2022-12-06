// Document variables
const form = document.getElementById('search-form');
const linkInput = document.getElementById('link');
const errorMsg = document.getElementById('error');
const result = document.getElementById('video-result');
const loader = document.getElementById('loader-div');
const thumbnail = document.getElementById('thumbnail');
const videoTitle = document.getElementById('title');
const videoAuthor = document.getElementById('author');
const videoDuration = document.getElementById('duration');
const downloadDropdown = document.getElementById('dropdown');
const submitBtn = document.getElementById('submit-button');
const downloadBtn = document.getElementById('downloadBtn');
const closeModalBtn = document.getElementById('closeBtn');
const overlay = document.getElementById('overlay');
const modal = document.getElementById('modal');
const clear = document.getElementById('clear');

// Other variables.
let link = '';
let downloadVideoObj;

// Get link input.
linkInput.addEventListener('input', (event) => {
    link = event.target.value;
});

// Search for the video.
form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Verify that a link has been entered.
    if (link.length < 1) {
        errorMsg.textContent = "Error: URL not specified";
        linkInput.style.border = "1px solid #ff0000";
        return;
    }

    submitBtn.disabled = true;
    submitBtn.style.backgroundColor = "#8b0000"
    setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.style.backgroundColor = "#FF0000"
    }, 5000);

    // Check if it's a valid link.
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|playlist\?|watch\?v=|watch\?.+(?:&|&#38;);v=))([a-zA-Z0-9\-_]{11})?(?:(?:\?|&|&#38;)index=((?:\d){1,3}))?(?:(?:\?|&|&#38;)?list=([a-zA-Z\-_0-9]{34}))?(?:\S+)?/g;
    if (!regex.test(link)) {
        errorMsg.textContent = "Error: Invalid URL";
        linkInput.style.border = "1px solid #ff0000";
        return;
    }

    downloadDropdown.innerHTML = '';
    errorMsg.textContent = "";
    loader.classList.add('loading');
    result.classList.remove('active');

    // Send data to the server.
    const baseUrl = 'http://localhost:3000/search';
    const videoObj = await fetch(baseUrl,
        {
            method: 'POST',
            headers: {
                "content-Type": 'application/json'
            },
            body: JSON.stringify({
                queryUrl: link
            })
        }).then((response) => response.json())
        .then((responseJSON) => {
            return responseJSON;
        });

    if (videoObj.status == "failed") {
        errorMsg.textContent = "Error: Invalid URL";
        linkInput.style.border = "1px solid #ff0000";
        loader.style.opacity = '0%';
        return;
    }
    downloadVideoObj = videoObj;

    linkInput.style.border = "none white";
    loader.classList.remove('loading');
    result.classList.add('active');

    thumbnail.src = videoObj.thumbnail;
    videoTitle.textContent = videoObj.title;
    videoTitle.href = videoObj.videoURL;
    videoAuthor.textContent = videoObj.author;
    videoAuthor.href = videoObj.authorURL;

    // Convert time in secods to hh:mm:ss format.
    let durationTimestamp;
    if (parseInt(videoObj.duration) < 3600) {
        durationTimestamp = new Date(parseInt(videoObj.duration) * 1000).toISOString().slice(14, 19);
    } else {
        durationTimestamp = new Date(parseInt(videoObj.duration) * 1000).toISOString().slice(11, 19);
    }
    videoDuration.textContent = durationTimestamp;

    // Fill dropdown with available resolution options.
    const element = document.createElement("option");
    element.textContent = `Audio Only | mp3`;
    element.value = `Audio Only:mp3`;
    downloadDropdown.appendChild(element);
    for (let i = 0; i < Object.keys(videoObj.container).length; i++) {
        const element = document.createElement("option");
        let hasAudio;
        if (videoObj.container[i].hasAudio) {
            hasAudio = '🔊';
        } else {
            hasAudio = '🔇';
        }
        element.textContent = `${hasAudio} ${videoObj.container[i].resolution} | ${videoObj.container[i].format}`;
        element.setAttribute('resolution', videoObj.container[i].resolution);
        element.setAttribute('format', videoObj.container[i].format);
        element.setAttribute('itag', videoObj.container[i].itag);
        downloadDropdown.appendChild(element);
    }
});

// Begin download.
downloadBtn.addEventListener('click', async (event) => {
    const videoResolution = downloadDropdown.options[downloadDropdown.selectedIndex].getAttribute('resolution');
    const videoFormat = downloadDropdown.options[downloadDropdown.selectedIndex].getAttribute('format');
    const videoItag = downloadDropdown.options[downloadDropdown.selectedIndex].getAttribute('itag');
    const name = `${downloadVideoObj.title}.${videoFormat}`;

    modal.classList.add('active');
    overlay.classList.add('active');

    const baseUrl = 'http://localhost:3000/download';
    const download = await fetch(baseUrl,
        {
            method: 'POST',
            headers: {
                "content-Type": 'application/json'
            },
            body: JSON.stringify({
                resolution: videoResolution,
                format: videoFormat,
                itag: videoItag,
                url: downloadVideoObj.videoURL,
            })
        })

    const downloadBlob = await download.blob();
    const downloadUrl = URL.createObjectURL(downloadBlob);

    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = name;
    modal.appendChild(anchor);
    anchor.click();
    modal.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);

    modal.classList.remove('active');
    overlay.classList.remove('active');
});

// Clear input.
clear.addEventListener('click', ()=> {
    form.reset();
});