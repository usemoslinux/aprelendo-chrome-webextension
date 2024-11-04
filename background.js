/**
 * Redirects user to Aprelendo to add the text/video shown in active tab
 */
function redirect(msg) {
  chrome.tabs.query({ currentWindow: true, active: true }).then((tabs) => {
    if (!tabs || tabs.length === 0) {
      console.error("No active tab found.");
      return;
    }

    const tab = tabs[0];
    if (!tab || !tab.url) {
      console.error("Active tab is invalid or has no URL.");
      return;
    }

    const lang = msg.lang;
    let aprelendo_url = `https://www.aprelendo.com/addtext.php?lang=${lang}&url=${encodeURIComponent(tab.url)}`;
    const yt_urls = [
      'https://www.youtube.com/watch',
      'https://m.youtube.com/watch',
      'https://youtu.be/'
    ];

    for (let i = 0; i < yt_urls.length; i++) {
      if (tab.url.lastIndexOf(yt_urls[i]) === 0) {
        aprelendo_url = `https://www.aprelendo.com/addvideo.php?lang=${lang}&url=${encodeURIComponent(tab.url)}`;
        break;
      }
    }

    // Open the Aprelendo URL in a new tab
    chrome.tabs.create({
      url: aprelendo_url,
      active: true,
      index: tab.index + 1 // Open the new tab right after the current one
    });
  }, console.error);
}

chrome.runtime.onMessage.addListener(redirect);

/**
 * User pressed keyboard shortcut to add page to Aprelendo
 * The language used is defined in the Preferences
 */
chrome.commands.onCommand.addListener(async (command) => {
  // add page to Aprelendo using
  if (command === 'add-page') {
    chrome.storage.sync.get(['shortcut_lang'], (res) => {
        redirect({ lang: (typeof res.shortcut_lang === "undefined") ? 'en' : res.shortcut_lang });
    });
  }
});
