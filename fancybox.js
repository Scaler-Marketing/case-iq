/**
 * Case IQ — Lightbox (Fancybox, lazy-loaded)
 * ==========================================
 *
 * Opens a Fancybox image gallery when users click marked <img> elements in Webflow.
 * Images are grouped by `data-lightbox-group` so each group acts as its own slideshow.
 *
 * PERFORMANCE: Fancybox itself (JS + CSS) is NOT loaded at page load. It is fetched
 * on the FIRST click of a lightbox image and reused thereafter. Pages with no gallery
 * (or where no one opens one) never download it.
 *
 * ---
 * Webflow setup (IMPORTANT — changed from the old version)
 * ---
 *
 * REMOVE these two eager tags from Webflow Custom Code — this script now loads them on demand:
 *   ❌ Head:   <link rel="stylesheet" href=".../@fancyapps/ui@6.1/dist/fancybox/fancybox.css" />
 *   ❌ Footer: <script src=".../@fancyapps/ui@6.1/dist/fancybox/fancybox.umd.js"></script>
 *
 * KEEP only this script (Footer, before </body>):
 *   <script src="https://cdn.jsdelivr.net/gh/Scaler-Marketing/case-iq@<new-version>/fancybox.js"></script>
 *
 * ---
 * Image attributes (Designer → Image → Custom Attributes) — UNCHANGED
 * ---
 *   data-lightbox=""                Required. Marks the image as lightbox-eligible.
 *   data-lightbox-group="general"   Required. Non-empty group name (gallery).
 *   data-lightbox-caption=""        Optional. Caption shown in the lightbox.
 */
(() => {
  // Prevent double-init if the script is embedded more than once (e.g. site + page code).
  if (window.__caseIqLightboxInitialized) return;
  window.__caseIqLightboxInitialized = true;

  const IMAGE_SELECTOR = "img[data-lightbox]";

  // Fancybox assets — loaded on first use only, never at page load.
  const FANCYBOX_JS  = "https://cdn.jsdelivr.net/npm/@fancyapps/ui@6.1/dist/fancybox/fancybox.umd.js";
  const FANCYBOX_CSS = "https://cdn.jsdelivr.net/npm/@fancyapps/ui@6.1/dist/fancybox/fancybox.css";

  let fancyboxLoader = null; // memoised promise so the library loads at most once

  /** Inject the stylesheet once. */
  function loadCss(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  /** Inject a script and resolve when it has loaded. */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  /** Load Fancybox (JS + CSS) on first call; reuse the same promise afterwards. */
  function ensureFancybox() {
    if (typeof Fancybox !== "undefined") return Promise.resolve();
    if (!fancyboxLoader) {
      loadCss(FANCYBOX_CSS);
      fancyboxLoader = loadScript(FANCYBOX_JS);
    }
    return fancyboxLoader;
  }

  /**
   * Returns the group name for an image, or null if the image should be excluded.
   * A missing or empty `data-lightbox-group` deliberately disables the lightbox.
   */
  function getImageGroup(img) {
    const group = img.getAttribute("data-lightbox-group");
    if (group === null || group === "") return null;
    return group;
  }

  /** Confirms an element is a fully configured lightbox image (flag + valid group). */
  function isLightboxImage(img) {
    return img.matches(IMAGE_SELECTOR) && getImageGroup(img) !== null;
  }

  /** Optional caption — blank attribute is treated as no caption. */
  function getImageCaption(img) {
    return img.getAttribute("data-lightbox-caption") || "";
  }

  /** Prefer currentSrc so responsive/srcset images resolve to the active variant. */
  function getImageSrc(img) {
    return img.currentSrc || img.src;
  }

  /** Collect all active images on the page that belong to the given group. */
  function getGroupImages(group) {
    return [...document.querySelectorAll(IMAGE_SELECTOR)].filter(
      (img) => getImageGroup(img) === group
    );
  }

  /** Map DOM images to the item format expected by Fancybox.show(). */
  function buildGalleryItems(images) {
    return images.map((img) => ({
      src: getImageSrc(img),
      type: "image",
      caption: getImageCaption(img),
    }));
  }

  /** Build the group gallery and open Fancybox at the clicked image's index. */
  function openLightbox(clickedImage) {
    const group = getImageGroup(clickedImage);
    if (!group) return;

    const groupImages = getGroupImages(group);
    const startIndex = groupImages.indexOf(clickedImage);
    if (startIndex === -1 || groupImages.length === 0) return;

    Fancybox.show(buildGalleryItems(groupImages), { startIndex });
  }

  /** Delegated click handler — lazy-loads Fancybox on first use, then opens. */
  function handleImageClick(event) {
    const clickedImage = event.target.closest(IMAGE_SELECTOR);
    if (!clickedImage || !isLightboxImage(clickedImage)) return; // null-guard added

    event.preventDefault();
    ensureFancybox()
      .then(() => openLightbox(clickedImage))
      .catch((err) => console.warn("[Case IQ Lightbox]", err));
  }

  function initLightbox() {
    document.addEventListener("click", handleImageClick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLightbox, { once: true });
  } else {
    initLightbox();
  }
})();
