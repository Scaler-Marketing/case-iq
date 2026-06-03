/**
 * Case IQ — Article topic tags → Resource Center filter
 *
 * Elements with a non-empty `article-topic` attribute (e.g. "Employee Misconduct",
 * "Ethics & Compliance") navigate to /resource-center?topic={slug} on click.
 *
 * Slug rules: lowercase, spaces → dashes, "&" → "and"
 * (matches select-query-param-sync.js / Finsweet topic filters)
 *
 * Webflow: Page Settings → Custom Code → Before </body>
 * Add cursor: pointer in Designer on clickable topic elements if needed.
 */
(() => {
  if (window.__caseIqArticleTopicRedirectInitialized) return;
  window.__caseIqArticleTopicRedirectInitialized = true;

  const ATTRIBUTE_NAME = "article-topic";
  const RESOURCE_CENTER_PATH = "/resource-center";
  const TOPIC_PARAM = "topic";
  const TOPIC_SELECTOR = `[${ATTRIBUTE_NAME}]`;

  function readTopicLabel(element) {
    const raw = String(element.getAttribute(ATTRIBUTE_NAME) || "").trim();
    if (!raw) return "";

    return raw.replace(/&amp;/gi, "&").trim();
  }

  function toTopicParam(topicLabel) {
    let normalized = String(topicLabel || "").trim().toLowerCase();
    if (!normalized) return "";

    if (typeof normalized.normalize === "function") {
      normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    return normalized
      .replace(/&/g, " and ")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function buildResourceCenterUrl(topicLabel) {
    const slug = toTopicParam(topicLabel);
    if (!slug) return "";

    const url = new URL(RESOURCE_CENTER_PATH, window.location.origin);
    url.searchParams.set(TOPIC_PARAM, slug);
    return url.pathname + url.search;
  }

  function handleClick(event) {
    const topicEl = event.target.closest(TOPIC_SELECTOR);
    if (!topicEl) return;

    const topicLabel = readTopicLabel(topicEl);
    const destination = buildResourceCenterUrl(topicLabel);
    if (!destination) return;

    event.preventDefault();
    window.location.assign(destination);
  }

  function initArticleTopicRedirect() {
    document.addEventListener("click", handleClick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initArticleTopicRedirect, {
      once: true,
    });
  } else {
    initArticleTopicRedirect();
  }
})();
