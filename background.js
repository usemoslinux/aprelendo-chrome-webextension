import { languages } from './shared/languages.js';
import { detectLang } from './shared/language_detector.js';

// background.js

const supportedLangCodes = new Set(languages.map(l => l.code));

async function getShortcutFallbackLang() {
    const { shortcut_lang } = await chrome.storage.sync.get(['shortcut_lang']);
    return shortcut_lang || 'en';
}

async function shouldOpenInNewTab() {
    const { open_in_new_tab } = await chrome.storage.sync.get(['open_in_new_tab']);
    return typeof open_in_new_tab === 'undefined' ? true : open_in_new_tab;
}

async function redirect(msg) {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });
    if (!tab || !tab.url) throw new Error("No active tab URL.");

    const lang = msg.lang;
    const yt = ['https://www.youtube.com/watch', 'https://m.youtube.com/watch', 'https://youtu.be/'];
    const isYouTube = yt.some(prefix => tab.url.startsWith(prefix));

    const aprelendo_url = isYouTube
        ? `https://www.aprelendo.com/addvideo.php?lang=${lang}&url=${encodeURIComponent(tab.url)}`
        : `https://www.aprelendo.com/addtext.php?lang=${lang}&url=${encodeURIComponent(tab.url)}`;

    const openInNewTab = await shouldOpenInNewTab();
    if (openInNewTab) {
        await chrome.tabs.create({ url: aprelendo_url, active: true, index: (tab.index ?? 0) + 1 });
    } else if (tab.id) {
        await chrome.tabs.update(tab.id, { url: aprelendo_url, active: true });
    }
}

async function detectTabLanguage(tab) {
    if (!tab || !tab.id) return null;
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText.slice(0, 2000)
        });
        const text = results[0].result;
        if (!text) return null;
        const detected = detectLang(text);
        return supportedLangCodes.has(detected) ? detected : null;
    } catch (e) {
        // Can fail on special pages like chrome://
        console.error("Language detection failed:", e);
        return null;
    }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'getDetectedLanguage') {
        (async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const lang = await detectTabLanguage(tab);
            sendResponse({ lang });
        })();
        return true; // Keep message port open for async response
    }

    // Handler for redirection from popup
    if (msg.lang) {
        (async () => {
            try {
                await redirect(msg);
                sendResponse({ ok: true });
            } catch (e) {
                console.error(e);
                sendResponse({ ok: false, error: e?.message });
            }
        })();
        return true;
    }
});

chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'add-page') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const detectedLang = await detectTabLanguage(tab);
        const lang = detectedLang || await getShortcutFallbackLang();
        try { await redirect({ lang }); } catch (e) { console.error(e); }
    }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'add-page-auto-detect') {
        const detectedLang = await detectTabLanguage(tab);
        const lang = detectedLang || await getShortcutFallbackLang();
        try { await redirect({ lang }); } catch (e) { console.error(e); }
    }
});

async function cacheVisibleLanguages() {
    const keys = languages.map(l => `show_${l.code}`);
    const settings = await chrome.storage.sync.get(keys);
    const visibleLangs = languages.filter(lang =>
        settings[`show_${lang.code}`] || typeof settings[`show_${lang.code}`] === 'undefined'
    );
    await chrome.storage.local.set({ cached_languages: visibleLangs });
}

chrome.runtime.onInstalled.addListener(() => {
    // Create context menu
    chrome.contextMenus.create({
        id: "add-page-auto-detect",
        title: "Add to Aprelendo (auto-detect language)",
        contexts: ["page"]
    });

    // Initial caching of visible languages
    cacheVisibleLanguages();
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        const langSettingChanged = Object.keys(changes).some(key => key.startsWith('show_'));
        if (langSettingChanged) {
            cacheVisibleLanguages();
        }
    }
});
