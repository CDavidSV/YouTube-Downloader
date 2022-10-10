const form = document.getElementById('search-form');
const linkInput = document.getElementById('link');
const errorMsg = document.getElementById('error');

let link = '';

linkInput.addEventListener('input', (event) => {
    link = event.target.value;
});

form.addEventListener('submit', (event) => {
    event.preventDefault();

    // Verify that a link has been entered.
    if (link.length < 1) {
        errorMsg.textContent = "Error: URL not specified";
        linkInput.style.border = "1px solid #ff0000";
        return;
    }

    // Check if it's a valid link.
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|playlist\?|watch\?v=|watch\?.+(?:&|&#38;);v=))([a-zA-Z0-9\-_]{11})?(?:(?:\?|&|&#38;)index=((?:\d){1,3}))?(?:(?:\?|&|&#38;)?list=([a-zA-Z\-_0-9]{34}))?(?:\S+)?/g;
    if (!regex.test(link)) {
        errorMsg.textContent = "Error: Invalid URL";
        linkInput.style.border = "1px solid #ff0000";
        return;
    }

    console.log(link);
    errorMsg.textContent = "";
    linkInput.style.border = "none white";

}); 