import { languages } from '../shared/languages.js';

document.addEventListener("DOMContentLoaded", async () => {
    const popup = document.querySelector("#popup-content");

    function buildPopup(visibleLangs) {
        for (const lang of visibleLangs) {
            const el = document.createElement('div');
            el.id = lang.code;
            el.className = `button ${lang.code}`;
            el.textContent = chrome.i18n.getMessage(lang.name);
            popup.appendChild(el);
        }
    }

    const res = await chrome.storage.local.get('cached_languages');
    if (res.cached_languages && res.cached_languages.length > 0) {
        buildPopup(res.cached_languages);
    } else {
        // Fallback for safety, though it should rarely be needed
        const sync_res = await chrome.storage.sync.get(languages.map(l => `show_${l.code}`));
        const visibleLangs = languages.filter(lang =>
            sync_res[`show_${lang.code}`] || typeof sync_res[`show_${lang.code}`] === 'undefined'
        );
        buildPopup(visibleLangs);
    }

    popup.tabIndex = -1;
    popup.focus();

    let busy = false;

    const handlePick = async (e) => {
        const btn = e.target.closest('.button');
        if (!btn || busy) return;
        busy = true; // debounce

        await chrome.runtime.sendMessage({ lang: btn.id });
        // close even if no ack (older Chromium) — but only once
        setTimeout(() => window.close(), 0);
    };

    // Use a single event to avoid double fire
    document.addEventListener('pointerdown', handlePick, { passive: true });

    // Optional keyboard support (Enter/Space) without using 'click'
    document.addEventListener('keydown', async (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !busy) {
            const btn = document.activeElement?.closest?.('.button');
            if (btn) {
                e.preventDefault();
                busy = true;
                await chrome.runtime.sendMessage({ lang: btn.id });
                setTimeout(() => window.close(), 0);
            }
        }
    });
});