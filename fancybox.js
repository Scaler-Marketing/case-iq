/**
 * Case IQ — Lightbox (Fancybox)
 * =============================
 *
 * Opens a Fancybox image gallery when users click marked <img> elements in Webflow.
 * Images are grouped by `data-lightbox-group` so each group acts as its own slideshow.
 *
 * ---
 * Webflow setup
 * ---
 *
 * Head (Project Settings → Custom Code → Head):
 *   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fancyapps/ui@6.1/dist/fancybox/fancybox.css" />
 *
 * Footer (Project Settings → Custom Code → Footer, before </body>):
 *   1. Fancybox JS CDN
 *   2. Cursor CSS (see lightbox.html)
 *   3. This script (inline or hosted)
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@fancyapps/ui@6.1/dist/fancybox/fancybox.umd.js"></script>
 *
 * ---
 * Image attributes (Designer → Image → Custom Attributes)
 * ---
 *
 *   data-lightbox=""                Required. Marks the image as lightbox-eligible.
 *   data-lightbox-group="general"   Required. Non-empty group name. Images with the same
 *                                   group appear together in one gallery. If this attribute
 *                                   is missing or blank, the image is ignored entirely.
 *   data-lightbox-caption=""        Optional. Caption shown in the lightbox. Leave blank
 *                                   if not needed — the client can fill this in per image.
 *
 * ---
 * Behaviour
 * ---
 *
 * - Only <img> elements are supported (not divs, links, or background images).
 * - Clicking an active image opens Fancybox at that image's position in the group.
 * - Prev/next navigation is limited to images sharing the same `data-lightbox-group`.
 * - Gallery order follows DOM order on the page.
 * - Images with `data-lightbox` but no valid group do not open and do not get a pointer cursor.
 * - Uses event delegation on document, so CMS/dynamic content does not need re-init.
 *
 * ---
 * Example
 * ---
 *
 *   <img
 *     src="product-screenshot.avif"
 *     alt="Case Management dashboard"
 *     data-lightbox=""
 *     data-lightbox-group="general"
 *     data-lightbox-caption="Case Management dashboard"
 *   />
 */
(() => {
  // Prevent double-init if the script is embedded more than once (e.g. site + page code).
  if (window.__caseIqLightboxInitialized) return;
  window.__caseIqLightboxInitialized = true;

  // Base selector — further validated by isLightboxImage() which also requires a group.
  const IMAGE_SELECTOR = "img[data-lightbox]";

  /**
   * Returns the group name for an image, or null if the image should be excluded.
   * A missing or empty `data-lightbox-group` deliberately disables the lightbox.
   */
  function getImageGroup(img) {
    const group = img.getAttribute("data-lightbox-group");
    if (group === null || group === "") return null;
    return group;
  }

  /**
   * Confirms an element is a fully configured lightbox image (flag + valid group).
   */
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
    if (typeof Fancybox === "undefined") {
      console.warn("[Case IQ Lightbox] Fancybox is not loaded.");
      return;
    }

    const group = getImageGroup(clickedImage);
    if (!group) return;

    const groupImages = getGroupImages(group);
    const startIndex = groupImages.indexOf(clickedImage);

    if (startIndex === -1 || groupImages.length === 0) return;

    Fancybox.show(buildGalleryItems(groupImages), {
      startIndex,
    });
  }

  /** Delegated click handler — works for images rendered on load or via CMS. */
  function handleImageClick(event) {
    const clickedImage = event.target.closest(IMAGE_SELECTOR);
    if (!isLightboxImage(clickedImage)) return;

    event.preventDefault();
    openLightbox(clickedImage);
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
