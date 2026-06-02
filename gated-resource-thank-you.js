/**
 * Case IQ — Gated resource: render thank-you page from sessionStorage
 *
 * Pair with gated-resource-store.js (article page) and gated-resource-marketo-redirect.js (form page).
 *
 * Targets (on the success / thank-you page):
 *   [gated-resource="article-name"]  — breadcrumb label + link to source article
 *   [gated-resource="thank-you"]     — heading: Thank you! Download “{name}” below.
 *   [gated-resource="attachment"]    — download button / overlay link href
 *
 * Optional attributes on [gated-resource="thank-you"]:
 *   data-thank-you-template="Thank you! Download “{{article_name}}” below."
 *
 * Paste in Webflow: Page Settings → Custom Code → Before </body> (thank-you page).
 */
(() => {
  if (window.__caseIqGatedResourceRenderInitialized) return;
  window.__caseIqGatedResourceRenderInitialized = true;

  const URL_STORAGE_KEY = "caseiq_gated_resource_url";
  const ARTICLE_NAME_STORAGE_KEY = "caseiq_gated_resource_article_name";
  const ARTICLE_LINK_STORAGE_KEY = "caseiq_gated_resource_article_link";

  const ARTICLE_NAME_SELECTOR = '[gated-resource="article-name"]';
  const THANK_YOU_SELECTOR = '[gated-resource="thank-you"]';
  const ATTACHMENT_SELECTOR = '[gated-resource="attachment"]';

  const DEFAULT_THANK_YOU_TEMPLATE =
    'Thank you! Download “{{article_name}}” below.';

  const BUTTON_OVERLAY_SELECTOR =
    "a.button_link-overlay, .button_link-overlay";

  function readAttachmentUrl() {
    if (typeof window.getCaseIqGatedResourceUrl === "function") {
      return window.getCaseIqGatedResourceUrl() || "";
    }

    try {
      return window.sessionStorage.getItem(URL_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function readArticleName() {
    if (typeof window.getCaseIqGatedResourceArticleName === "function") {
      return window.getCaseIqGatedResourceArticleName() || "";
    }

    try {
      return window.sessionStorage.getItem(ARTICLE_NAME_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function readArticleLink() {
    if (typeof window.getCaseIqGatedResourceArticleLink === "function") {
      return window.getCaseIqGatedResourceArticleLink() || "";
    }

    try {
      return window.sessionStorage.getItem(ARTICLE_LINK_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function resolveUrl(url) {
    const trimmed = (url || "").trim();
    if (!trimmed) return "";

    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("//")) {
      return trimmed;
    }

    if (trimmed.startsWith("/")) {
      return `${window.location.origin}${trimmed}`;
    }

    return trimmed;
  }

  function setTextContent(el, text) {
    if (!el || text == null) return;

    const label =
      el.querySelector(":scope > div") ||
      el.querySelector("div") ||
      el;

    if (label && label !== el) {
      label.textContent = text;
      return;
    }

    el.textContent = text;
  }

  function buildThankYouMessage(template, articleName) {
    const safeName = (articleName || "").trim();
    const tpl = (template || DEFAULT_THANK_YOU_TEMPLATE).trim();

    return tpl.replace(/\{\{\s*article_name\s*\}\}/gi, safeName);
  }

  function renderArticleName() {
    const articleName = readArticleName();
    const articleLink = resolveUrl(readArticleLink());

    if (!articleName && !articleLink) return;

    document.querySelectorAll(ARTICLE_NAME_SELECTOR).forEach((el) => {
      if (articleName) {
        setTextContent(el, articleName);
      }

      if (articleLink) {
        el.setAttribute("href", articleLink);

        if (el.tagName !== "A") {
          const innerLink = el.querySelector("a[href]");
          if (innerLink) innerLink.setAttribute("href", articleLink);
        }
      }
    });
  }

  function renderThankYou() {
    const articleName = readArticleName();
    if (!articleName) return;

    document.querySelectorAll(THANK_YOU_SELECTOR).forEach((el) => {
      const template =
        el.getAttribute("data-thank-you-template") ||
        el.getAttribute("data-template") ||
        DEFAULT_THANK_YOU_TEMPLATE;

      el.textContent = buildThankYouMessage(template, articleName);
    });
  }

  function applyDownloadTarget(el, url) {
    const overlay = el.querySelector(BUTTON_OVERLAY_SELECTOR);

    if (overlay) {
      overlay.setAttribute("href", url);
      overlay.removeAttribute("target");
      overlay.setAttribute("rel", "noopener noreferrer");
    }

    if (el.tagName === "A") {
      el.setAttribute("href", url);
      return;
    }

    el.setAttribute("data-download-url", url);

    if (!el.__caseIqGatedResourceDownloadBound) {
      el.__caseIqGatedResourceDownloadBound = true;

      el.addEventListener("click", (event) => {
        const downloadUrl =
          el.getAttribute("data-download-url") ||
          el.querySelector(BUTTON_OVERLAY_SELECTOR)?.getAttribute("href");

        if (!downloadUrl || downloadUrl === "#") return;

        const link = el.querySelector(BUTTON_OVERLAY_SELECTOR);
        if (link && event.target.closest(BUTTON_OVERLAY_SELECTOR)) return;

        if (link && link.getAttribute("href") && link.getAttribute("href") !== "#") {
          return;
        }

        event.preventDefault();
        window.location.assign(downloadUrl);
      });
    }
  }

  function renderAttachment() {
    const attachmentUrl = resolveUrl(readAttachmentUrl());
    if (!attachmentUrl) return;

    document.querySelectorAll(ATTACHMENT_SELECTOR).forEach((el) => {
      applyDownloadTarget(el, attachmentUrl);
    });
  }

  function render() {
    renderArticleName();
    renderThankYou();
    renderAttachment();

    if (typeof console !== "undefined" && console.debug) {
      console.debug("[CaseIQ Gated Resource] rendered thank-you UI", {
        articleName: readArticleName(),
        articleLink: readArticleLink(),
        attachmentUrl: readAttachmentUrl(),
      });
    }
  }

  window.renderCaseIqGatedResourceUi = render;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render, { once: true });
  } else {
    render();
  }
})();
