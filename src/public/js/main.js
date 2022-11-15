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

let link = '';

linkInput.addEventListener('input', (event) => {
    link = event.target.value;
});

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
    result.style.opacity = '0%';
    loader.style.opacity = '100%';
    loader.style.transform = 'scale(1)';
    errorMsg.textContent = "";

    // Send data to the server.
    const baseUrl = 'http://localhost:3000/search';
    const videoObj = await fetch(baseUrl,
        {
            method: 'POST',
            headers: {
                "content-Type": 'application/json'
            },
            body: JSON.stringify({
                parcel: link
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

    linkInput.style.border = "none white";
    result.style.opacity = '100%';
    loader.style.opacity = '0%';

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
    for (let i = 0; i < Object.keys(videoObj.container).length; i++) {
        const element = document.createElement("a");
        element.textContent = `${videoObj.container[i].resolution} - ${videoObj.container[i].format}`;
        downloadDropdown.appendChild(element);
    }
}); 