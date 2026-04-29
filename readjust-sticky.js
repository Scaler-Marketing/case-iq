(() => {
  if (window.__readjustStickyInitialized) return;
  window.__readjustStickyInitialized = true;

  const NAV_SELECTOR = ".mega-nav";
  const STICKY_SELECTOR = "[readjust-sticky]";
  const observedNavs = new WeakSet();

  let resizeObserver = null;
  let mutationObserver = null;
  let scheduledFrame = null;

  function normalizeOffset(value) {
    const rawValue = String(value ?? "").trim();
    if (!rawValue) return "0px";

    if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
      return `${rawValue}px`;
    }

    return rawValue;
  }

  function measureCssLength(lengthValue) {
    const probe = document.createElement("div");

    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.inset = "0 auto auto 0";
    probe.style.height = lengthValue;

    document.body.appendChild(probe);
    const measuredHeight = probe.getBoundingClientRect().height;
    probe.remove();

    return measuredHeight;
  }

  function isVisible(element) {
    return Boolean(element) && element.getClientRects().length > 0;
  }

  function describeElement(element) {
    if (!element) return "unknown";

    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const className =
      typeof element.className === "string"
        ? element.className
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 3)
            .map((name) => `.${name}`)
            .join("")
        : "";

    return `${tagName}${id}${className}`;
  }

  function getReferenceCandidateData(stickyElement) {
    const candidates = [];

    document.querySelectorAll(NAV_SELECTOR).forEach((navElement) => {
      if (!isVisible(navElement)) return;

      if (!navElement.contains(stickyElement)) {
        candidates.push({
          element: navElement,
          source: "nav",
          rect: navElement.getBoundingClientRect(),
        });
        return;
      }

      Array.from(navElement.children).forEach((childElement) => {
        if (!isVisible(childElement)) return;
        if (childElement.contains(stickyElement)) return;

        candidates.push({
          element: childElement,
          source: "nav-child",
          rect: childElement.getBoundingClientRect(),
        });
      });
    });

    return candidates;
  }

  function getReferenceOffset(stickyElement) {
    const stickyRect = stickyElement.getBoundingClientRect();
    const candidateData = getReferenceCandidateData(stickyElement);

    const bestCandidate = candidateData.reduce((best, candidate) => {
      if (!best) return candidate;
      return candidate.rect.bottom > best.rect.bottom ? candidate : best;
    }, null);

    if (bestCandidate) {
      return {
        referenceBottom: Math.max(0, bestCandidate.rect.bottom),
        referenceElement: bestCandidate.element,
        referenceSource: bestCandidate.source,
        stickyTopBeforeApply: stickyRect.top,
        candidateCount: candidateData.length,
      };
    }

    const fallbackNav = Array.from(document.querySelectorAll(NAV_SELECTOR)).find(
      (element) => isVisible(element),
    );
    const fallbackRect = fallbackNav?.getBoundingClientRect();

    return {
      referenceBottom: Math.max(0, fallbackRect?.bottom ?? 0),
      referenceElement: fallbackNav ?? null,
      referenceSource: fallbackNav ? "nav-fallback" : "none",
      stickyTopBeforeApply: stickyRect.top,
      candidateCount: candidateData.length,
    };
  }

  function updateStickyOffsets() {
    document.querySelectorAll(STICKY_SELECTOR).forEach((element) => {
      const referenceData = getReferenceOffset(element);
      const authoredTop = normalizeOffset(
        element.getAttribute("readjust-sticky"),
      );
      const authoredTopPixels = measureCssLength(authoredTop);
      const appliedTopPixels = Math.max(
        referenceData.referenceBottom,
        authoredTopPixels,
      );
      const appliedTop = `${appliedTopPixels}px`;

      element.style.top = appliedTop;
    });
  }

  function observeMegaNavs() {
    if (!resizeObserver) return;

    document.querySelectorAll(NAV_SELECTOR).forEach((element) => {
      if (observedNavs.has(element)) return;
      resizeObserver.observe(element);
      observedNavs.add(element);
    });
  }

  function scheduleUpdate() {
    if (scheduledFrame !== null) return;

    scheduledFrame = window.requestAnimationFrame(() => {
      scheduledFrame = null;
      observeMegaNavs();
      updateStickyOffsets();
    });
  }

  function initReadjustSticky() {
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      observeMegaNavs();
    }

    if ("MutationObserver" in window && document.body) {
      mutationObserver = new MutationObserver(scheduleUpdate);
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("load", scheduleUpdate);
    window.addEventListener("pageshow", scheduleUpdate);

    scheduleUpdate();
  }

  window.initReadjustSticky = initReadjustSticky;
  window.updateReadjustSticky = scheduleUpdate;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initReadjustSticky, {
      once: true,
    });
  } else {
    initReadjustSticky();
  }
})();
