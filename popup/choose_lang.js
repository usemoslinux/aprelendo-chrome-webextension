document.addEventListener("DOMContentLoaded", () => {
    const popup = document.querySelector("#popup-content");
    const languages = [
        { code: 'ar', name: 'arabicName' }, { code: 'bg', name: 'bulgarianName' },
        { code: 'ca', name: 'catalanName' }, { code: 'zh', name: 'chineseName' },
        { code: 'hr', name: 'croatianName' }, { code: 'cs', name: 'czechName' },
        { code: 'da', name: 'danishName' }, { code: 'nl', name: 'dutchName' },
        { code: 'en', name: 'englishName' }, { code: 'fr', name: 'frenchName' },
        { code: 'de', name: 'germanName' }, { code: 'el', name: 'greekName' },
        { code: 'he', name: 'hebrewName' }, { code: 'hi', name: 'hindiName' },
        { code: 'hu', name: 'hungarianName' }, { code: 'it', name: 'italianName' },
        { code: 'ja', name: 'japaneseName' }, { code: 'ko', name: 'koreanName' },
        { code: 'no', name: 'norwegianName' }, { code: 'pl', name: 'polishName' },
        { code: 'pt', name: 'portugueseName' }, { code: 'ro', name: 'romanianName' },
        { code: 'ru', name: 'russianName' }, { code: 'sk', name: 'slovakName' },
        { code: 'sl', name: 'slovenianName' }, { code: 'es', name: 'spanishName' },
        { code: 'sv', name: 'swedishName' }, { code: 'tr', name: 'turkishName' },
        { code: 'vi', name: 'vietnameseName' }
    ];

    chrome.storage.sync.get(languages.map(l => `show_${l.code}`), (res) => {
        for (const lang of languages) {
            if (res[`show_${lang.code}`] || typeof res[`show_${lang.code}`] === 'undefined') {
                const el = document.createElement('div');
                el.id = lang.code;
                el.className = `button ${lang.code}`;
                el.textContent = chrome.i18n.getMessage(lang.name);
                popup.appendChild(el);
            }
        }
    });

    popup.tabIndex = -1;
    popup.focus();

    let busy = false;

    const handlePick = (e) => {
        const btn = e.target.closest('.button');
        if (!btn || busy) return;
        busy = true; // debounce

        chrome.runtime.sendMessage({ lang: btn.id }, () => {
            // close even if no ack (older Chromium) — but only once
            setTimeout(() => window.close(), 0);
        });
    };

    // Use a single event to avoid double fire
    document.addEventListener('pointerdown', handlePick, { passive: true });

    // Optional keyboard support (Enter/Space) without using 'click'
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !busy) {
            const btn = document.activeElement?.closest?.('.button');
            if (btn) {
                e.preventDefault();
                busy = true;
                chrome.runtime.sendMessage({ lang: btn.id }, () => setTimeout(() => window.close(), 0));
            }
        }
    });
});
