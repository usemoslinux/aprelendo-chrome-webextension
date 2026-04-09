const APRELENDO_BASE_URL = "https://www.aprelendo.com";
const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);
const YOUTUBE_HOSTS = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
]);

function parseSupportedPageUrl(url) {
    let parsedUrl;

    try {
        parsedUrl = new URL(url);
    } catch (_error) {
        throw new Error("The current page URL is invalid.");
    }

    if (!SUPPORTED_PROTOCOLS.has(parsedUrl.protocol)) {
        throw new Error(
            "This page cannot be sent to Aprelendo. Open a regular website page and try again."
        );
    }

    return parsedUrl;
}

function isYouTubeUrl(parsedUrl) {
    if (!YOUTUBE_HOSTS.has(parsedUrl.hostname)) return false;
    if (parsedUrl.hostname === "youtu.be") return true;

    return parsedUrl.pathname === "/watch";
}

export function buildAprelendoUrl(url, lang) {
    if (!url) throw new Error("No URL provided.");
    if (!lang) throw new Error("No language provided.");

    const parsedUrl = parseSupportedPageUrl(url);
    const path = isYouTubeUrl(parsedUrl) ? "addvideo.php" : "addtext.php";

    return `${APRELENDO_BASE_URL}/${path}?lang=${lang}&url=${encodeURIComponent(parsedUrl.toString())}`;
}
