// background.js

async function redirect(msg) {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });
    if (!tab || !tab.url) throw new Error("No active tab URL.");

    const lang = msg.lang;
    const yt = ['https://www.youtube.com/watch', 'https://m.youtube.com/watch', 'https://youtu.be/'];
    const isYouTube = yt.some(prefix => tab.url.startsWith(prefix));

    const aprelendo_url = isYouTube
        ? `https://www.aprelendo.com/addvideo.php?lang=${lang}&url=${encodeURIComponent(tab.url)}`
        : `https://www.aprelendo.com/addtext.php?lang=${lang}&url=${encodeURIComponent(tab.url)}`;

    await chrome.tabs.create({ url: aprelendo_url, active: true, index: (tab.index ?? 0) + 1 });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    // Keep the worker alive and reply when done
    (async () => {
        try {
            await redirect(msg);
            sendResponse({ ok: true });
        } catch (e) {
            console.error(e);
            sendResponse({ ok: false, error: e?.message });
        }
    })();
    return true; // important: keep service worker alive for async work
});

chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'add-page') {
        const res = await chrome.storage.sync.get(['shortcut_lang']);
        const lang = (typeof res.shortcut_lang === "undefined") ? 'en' : res.shortcut_lang;
        try { await redirect({ lang }); } catch (e) { console.error(e); }
    }
});
