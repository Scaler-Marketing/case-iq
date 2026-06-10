/**
 * Case IQ — Featured articles: copy CMS list data onto visible cards
 *
 * Source (hidden Webflow CMS list):
 *   [feature-article="source"]              — list wrapper
 *   [featured-article-source="link"]        — article URL (on the card link)
 *   [featured-article-source="image"]       — thumbnail
 *   [featured-article-source="topic"]       — topic label
 *   [featured-article-source="title"]       — article title
 *
 * Targets (visible layout cards, matched by index):
 *   [featured-article-target="link"]        — card link
 *   [featured-article-target="image"]       — thumbnail
 *   [featured-article-target="topic"]       — topic label
 *   [featured-article-target="title"]       — article title
 *
 * Paste in Webflow: Page Settings → Custom Code → Before </body>
 * (or site-wide if this block appears on multiple pages).
 */
(() => {
  if (window.__caseIqFeaturedArticlesRenderInitialized) return;
  window.__caseIqFeaturedArticlesRenderInitialized = true;

  const SOURCE_LIST_SELECTOR = '[feature-article="source"]';
  const SOURCE_LINK_SELECTOR = '[featured-article-source="link"]';
  const SOURCE_IMAGE_SELECTOR = '[featured-article-source="image"]';
  const SOURCE_TOPIC_SELECTOR = '[featured-article-source="topic"]';
  const SOURCE_TITLE_SELECTOR = '[featured-article-source="title"]';

  const TARGET_LINK_SELECTOR = '[featured-article-target="link"]';
  const TARGET_IMAGE_SELECTOR = '[featured-article-target="image"]';
  const TARGET_TOPIC_SELECTOR = '[featured-article-target="topic"]';
  const TARGET_TITLE_SELECTOR = '[featured-article-target="title"]';

  let sourceObserver = null;

  function getText(el) {
    if (!el) return "";
    return (el.textContent || "").trim();
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

  function getSourceItems(sourceList) {
    const items = sourceList.querySelectorAll(
      ':scope > [role="listitem"], :scope > .w-dyn-item',
    );

    if (items.length) return Array.from(items);

    return Array.from(sourceList.children).filter(
      (child) => child.nodeType === Node.ELEMENT_NODE,
    );
  }

  function readArticleFromSourceItem(itemEl) {
    const linkEl = itemEl.querySelector(SOURCE_LINK_SELECTOR);
    const imageEl = itemEl.querySelector(SOURCE_IMAGE_SELECTOR);
    const topicEl = itemEl.querySelector(SOURCE_TOPIC_SELECTOR);
    const titleEl = itemEl.querySelector(SOURCE_TITLE_SELECTOR);
    const title = getText(titleEl);

    return {
      href: (linkEl?.getAttribute("href") || "").trim(),
      imageSrc: (imageEl?.getAttribute("src") || "").trim(),
      imageAlt: (imageEl?.getAttribute("alt") || "").trim() || title,
      topic: getText(topicEl),
      title,
    };
  }

  function applyArticleToTarget(targetLinkEl, article) {
    if (!targetLinkEl || !article) return;

    if (article.href) {
      targetLinkEl.setAttribute("href", article.href);
    }

    const imageEl = targetLinkEl.querySelector(TARGET_IMAGE_SELECTOR);
    const topicEl = targetLinkEl.querySelector(TARGET_TOPIC_SELECTOR);
    const titleEl = targetLinkEl.querySelector(TARGET_TITLE_SELECTOR);

    if (imageEl) {
      if (article.imageSrc) imageEl.setAttribute("src", article.imageSrc);
      if (article.imageAlt) imageEl.setAttribute("alt", article.imageAlt);
    }

    if (article.topic) setTextContent(topicEl, article.topic);
    if (article.title) setTextContent(titleEl, article.title);
  }

  function renderFeaturedArticles() {
    const sourceList = document.querySelector(SOURCE_LIST_SELECTOR);
    if (!sourceList) return false;

    const articles = getSourceItems(sourceList)
      .map(readArticleFromSourceItem)
      .filter((article) => article.href || article.title);

    const targets = Array.from(document.querySelectorAll(TARGET_LINK_SELECTOR));

    if (!articles.length || !targets.length) return false;

    const count = Math.min(articles.length, targets.length);

    for (let i = 0; i < count; i += 1) {
      applyArticleToTarget(targets[i], articles[i]);
    }

    if (typeof console !== "undefined" && console.debug) {
      console.debug("[CaseIQ Featured Articles] rendered", {
        sourceCount: articles.length,
        targetCount: targets.length,
        renderedCount: count,
      });
    }

    return true;
  }

  function observeSourceList() {
    const sourceList = document.querySelector(SOURCE_LIST_SELECTOR);
    if (!sourceList || sourceObserver) return;

    sourceObserver = new MutationObserver(() => {
      renderFeaturedArticles();
    });

    sourceObserver.observe(sourceList, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["href", "src", "alt"],
    });
  }

  function init() {
    renderFeaturedArticles();
    observeSourceList();
  }

  window.renderCaseIqFeaturedArticles = renderFeaturedArticles;

  if (window.Webflow && Array.isArray(window.Webflow)) {
    window.Webflow.push(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
