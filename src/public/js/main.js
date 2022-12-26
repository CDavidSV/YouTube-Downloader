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
const progress = document.getElementById('file');
const progressContainer = document.querySelector('.progress-container');
const loadEllipsis = document.querySelector('.lds-ellipsis');
const progressPercentage = document.querySelector('.progress-done-percentage');

// Other variables.
let link = '';
let downloadVideoObj;
let APIUrl = 'http://localhost:3000'

/**
 * Converts seconds to a valid HH:MM:SS time format.
 * @param {*} timestamp time value in seconds.
 */
function convertTime(timestamp) {
    const hours = Math.floor(timestamp / 3600);
    const minutes = Math.floor(timestamp / 60 % 60);
    const seconds = Math.floor(timestamp % 60);

    let timeStr = '';

    if(hours > 0) {
        timeStr += `${hours}:`;
    }

    if (minutes < 10) {
        timeStr += `0${minutes}:`
    } else {
        timeStr += `${minutes}:`
    }

    if (seconds < 10) {
        timeStr += `0${seconds}`
    } else {
        timeStr += `${seconds}`
    }

    return timeStr;
}

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

    // Check if it's a valid link.
    const regex = /(?:https?:)?(?:\/\/)?(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\S*?[^\w\s-])([\w-]{11})(?=[^\w-]|$)(?![?=&+%\w.-]*(?:['"][^<>]*>|<\/a>))[?=&+%\w.-]*/gim;
    if (!regex.test(link)) {
        errorMsg.textContent = "Error: Invalid URL";
        linkInput.style.border = "1px solid #ff0000";
        return;
    }

    submitBtn.disabled = true;
    submitBtn.style.backgroundColor = "#8b0000"
    const cooldown = setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.style.backgroundColor = "#FF0000"
    }, 5000);

    downloadDropdown.innerHTML = '';
    errorMsg.textContent = "";
    loader.classList.add('loading');
    result.classList.remove('active');

    // Send data to the server.
    const videoObj = await fetch(`${APIUrl}/search`,
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
        errorMsg.textContent = `Error: Video not found`; // Error returned by the server.
        linkInput.style.border = "1px solid #ff0000";
        loader.classList.remove('loading');
        clearTimeout(cooldown);
        submitBtn.disabled = false;
        submitBtn.style.backgroundColor = "#FF0000"
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

    // Convert time in seconds to hh:mm:ss format.
    videoDuration.textContent = convertTime(videoObj.duration - 1);

    // Fill dropdown with available resolution options.
    const element = document.createElement("option");
    element.textContent = `Audio Only | mp3`;
    element.setAttribute('resolution', 'none');
    element.setAttribute('format', 'mp3');
    element.setAttribute('itag', 140);
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
    progress.style = `transform: scaleX(0);`
    progressContainer.classList.remove('downloading');
    const videoResolution = downloadDropdown.options[downloadDropdown.selectedIndex].getAttribute('resolution');
    const videoFormat = downloadDropdown.options[downloadDropdown.selectedIndex].getAttribute('format');
    const videoItag = downloadDropdown.options[downloadDropdown.selectedIndex].getAttribute('itag');
    const name = `${downloadVideoObj.title}.${videoFormat}`;

    modal.classList.add('active');
    overlay.classList.add('active');
    loadEllipsis.style.opacity = 1;

    const request = new XMLHttpRequest();
    request.open('POST', `${APIUrl}/download`, true);
    request.setRequestHeader("Content-Type", "application/json");
    request.responseType = "blob";   

    request.onload = () => {
        if (request.status !== 200) return;
        const downloadBlob = request.response;
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
    };

    request.onprogress = (e) => {
        const total = e.total;
        const loaded = e.loaded;
        const progressDone = (loaded / total) * 100;

        progressContainer.classList.add('downloading');
        loadEllipsis.style.opacity = 0;
        progress.style = `transform: scaleX(${progressDone / 100});`
        progressPercentage.innerHTML = `${progressDone.toFixed(1)}%`;
    }

    request.send(JSON.stringify({
        resolution: videoResolution,
        format: videoFormat,
        itag: videoItag,
        url: downloadVideoObj.videoURL,
    }));
});

// Clear input.
clear.addEventListener('click', ()=> {
    form.reset();
});