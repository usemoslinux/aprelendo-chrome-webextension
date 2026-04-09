import { languages } from "../shared/languages.js";
const browser = globalThis.browser || globalThis.chrome;

const GENERIC_ADD_ERROR = "The current page could not be added to Aprelendo.";

document.addEventListener("DOMContentLoaded", async () => {
  const popup = document.querySelector("#popup-content");
  const popupError = document.querySelector("#popup-error");
  let detectedLang = null;
  let busy = false;

  function showError(message) {
    popupError.textContent = message || GENERIC_ADD_ERROR;
    popupError.classList.remove("hidden");
  }

  function clearError() {
    popupError.textContent = "";
    popupError.classList.add("hidden");
  }

  function buildPopup(visibleLangs) {
    const fragment = document.createDocumentFragment();
    for (const lang of visibleLangs) {
      const el = document.createElement("div");
      el.id = lang.code;
      el.className = `button ${lang.code}`;
      el.textContent = browser.i18n.getMessage(lang.name);
      fragment.appendChild(el);
    }
    popup.appendChild(fragment);

    if (detectedLang) {
      highlightDetected(detectedLang);
    }
  }

  function highlightDetected(lang) {
    detectedLang = lang;
    const detectedButton = document.getElementById(lang);
    if (detectedButton) {
      const current = popup.querySelector(".detected");
      if (current) current.classList.remove("detected");

      detectedButton.classList.add("detected");
      requestAnimationFrame(() => {
        const popupRect = popup.getBoundingClientRect();
        const buttonRect = detectedButton.getBoundingClientRect();
        const offset =
          buttonRect.top -
          popupRect.top -
          (popup.clientHeight / 2 - detectedButton.offsetHeight / 2);
        popup.scrollTop += offset;
      });
    }
  }

  browser.runtime
    .sendMessage({ action: "getDetectedLanguage" })
    .then((response) => {
      if (response && response.lang) {
        highlightDetected(response.lang);
      }
    })
    .catch((error) => {
      console.error("Failed to get detected language:", error);
    });

  try {
    const res = await browser.storage.local.get("cached_languages");
    if (res.cached_languages && res.cached_languages.length > 0) {
      buildPopup(res.cached_languages);
    } else {
      const keys = languages.map((l) => `show_${l.code}`);
      const syncRes = await browser.storage.sync.get(keys);
      const visibleLangs = languages.filter(
        (lang) =>
          syncRes[`show_${lang.code}`] ||
          typeof syncRes[`show_${lang.code}`] === "undefined",
      );
      buildPopup(visibleLangs);
    }
  } catch (e) {
    console.error("Failed to load languages:", e);
    buildPopup(languages);
  }

  popup.tabIndex = -1;
  popup.focus();

  async function submitSelection(btn) {
    if (!btn || busy) return;
    busy = true;
    clearError();

    try {
      const response = await browser.runtime.sendMessage({ lang: btn.id });
      if (!response?.ok) {
        throw new Error(response?.error || GENERIC_ADD_ERROR);
      }
      setTimeout(() => window.close(), 0);
    } catch (error) {
      console.error("Failed to send selection:", error);
      showError(error instanceof Error ? error.message : GENERIC_ADD_ERROR);
      busy = false;
    }
  }

  popup.addEventListener("click", async (e) => {
    const btn = e.target.closest(".button");
    await submitSelection(btn);
  });

  document.addEventListener("keydown", async (e) => {
    if ((e.key === "Enter" || e.key === " ") && !busy) {
      const btn = document.activeElement?.closest?.(".button");
      if (btn) {
        e.preventDefault();
        await submitSelection(btn);
      }
    }
  });
});
