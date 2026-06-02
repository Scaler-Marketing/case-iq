/**
 * Case IQ — Research gate modal (Marketo form 2761)
 *
 * Flow:
 * 1. Auto-open modal on load (clicks [trigger-modal="open"])
 * 2. On successful Marketo submit → click [trigger-modal="close"], stop prompting
 * 3. If user closes without submitting → re-open once they scroll past SCROLL_THRESHOLD_PX
 *
 * Paste in Webflow: Page Settings → Custom Code → Before </body>
 * Do not run modal-cookie.js on the same page (it uses the same trigger attributes).
 */
(() => {
  if (window.__caseIqResearchModalInitialized) return;
  window.__caseIqResearchModalInitialized = true;

  const STORAGE_KEY = "caseiq_research_modal_submitted";
  const FORM_NUMERIC_ID = "2761";
  const MKTO_FORM_ID = `mktoForm_${FORM_NUMERIC_ID}`;
  const MODAL_SELECTOR = ".popup-modal_research-component";
  const OPEN_SELECTOR =
    ".popup-modal_research-trigger-open[trigger-modal='open']";
  const OPEN_FALLBACK = "[trigger-modal='open']";
  const CLOSE_SELECTOR = "[trigger-modal='close']";
  const SUCCESS_SELECTOR =
    ".wf_mkto_success, [data-wf-marketo-form-state='success']";
  const AUTO_OPEN_DELAY_MS = 400;
  const SCROLL_THRESHOLD_PX = 80;
  const MARKETO_POLL_MS = 500;
  const MARKETO_POLL_TIMEOUT_MS = 30000;

  let formSubmitted = readSubmittedFlag();
  let closingAfterSuccess = false;
  let awaitingScrollReopen = false;
  let scrollBaselineY = 0;
  let marketoHooksAttached = false;
  let domSuccessObserver = null;
  let modalVisibilityObserver = null;

  function readSubmittedFlag() {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  function persistSubmittedFlag() {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* ignore quota / private mode */
    }
  }

  function isVisible(node) {
    if (!node) return false;

    const style = window.getComputedStyle(node);

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) > 0 &&
      node.getClientRects().length > 0
    );
  }

  function getModal() {
    return document.querySelector(MODAL_SELECTOR);
  }

  function getScrollY() {
    return (
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    );
  }

  function isModalOpen() {
    const modal = getModal();
    if (!modal) return false;

    if (!isVisible(modal)) return false;

    const style = window.getComputedStyle(modal);
    const ariaHidden = modal.getAttribute("aria-hidden");

    if (ariaHidden === "true") return false;
    if (style.pointerEvents === "none") return false;

    return true;
  }

  function getMarketoPlaceholder() {
    const modal = getModal();
    if (!modal) return null;

    return (
      modal.querySelector(`[data-wf-marketo-form-id="${FORM_NUMERIC_ID}"]`) ||
      modal.querySelector(`#${MKTO_FORM_ID}`)?.closest("[data-wf-marketo-form-id]") ||
      null
    );
  }

  function getMarketoForm() {
    const modal = getModal();
    if (!modal) return null;

    return modal.querySelector(`#${MKTO_FORM_ID}`);
  }

  function isSuccessStateVisible() {
    const modal = getModal();
    if (!modal) return false;

    const successNodes = modal.querySelectorAll(SUCCESS_SELECTOR);

    return Array.from(successNodes).some((node) => isVisible(node));
  }

  function getOpenTrigger() {
    return (
      document.querySelector(OPEN_SELECTOR) ||
      document.querySelector(OPEN_FALLBACK)
    );
  }

  function getCloseTrigger() {
    const modal = getModal();
    if (modal) {
      const closeInModal = modal.querySelector(CLOSE_SELECTOR);
      if (closeInModal) return closeInModal;
    }

    return document.querySelector(CLOSE_SELECTOR);
  }

  function clickOpenTrigger() {
    if (formSubmitted) return false;

    const openTrigger = getOpenTrigger();
    if (!openTrigger) return false;

    openTrigger.click();
    return true;
  }

  function clickCloseTrigger() {
    const closeTrigger = getCloseTrigger();
    if (!closeTrigger) return false;

    closeTrigger.click();
    return true;
  }

  function handleFormSuccess(source) {
    if (formSubmitted) return;

    formSubmitted = true;
    closingAfterSuccess = true;
    persistSubmittedFlag();
    awaitingScrollReopen = false;

    detachScrollReopenListener();

    window.setTimeout(() => {
      clickCloseTrigger();
      closingAfterSuccess = false;
    }, 150);

    if (typeof console !== "undefined" && console.debug) {
      console.debug("[CaseIQ Research Modal] form submitted", { source });
    }
  }

  function handleCloseWithoutSubmit() {
    if (formSubmitted || closingAfterSuccess || awaitingScrollReopen) return;

    awaitingScrollReopen = true;
    scrollBaselineY = getScrollY();
    attachScrollReopenListener();

    if (typeof console !== "undefined" && console.debug) {
      console.debug("[CaseIQ Research Modal] armed scroll reopen", {
        scrollBaselineY,
      });
    }
  }

  function tryReopenAfterScroll() {
    if (formSubmitted || !awaitingScrollReopen || isModalOpen()) return;

    const scrollDelta = Math.abs(getScrollY() - scrollBaselineY);
    if (scrollDelta < SCROLL_THRESHOLD_PX) return;

    if (clickOpenTrigger()) {
      awaitingScrollReopen = false;
      detachScrollReopenListener();
    }
  }

  function onScrollForReopen() {
    tryReopenAfterScroll();
  }

  let scrollReopenAttached = false;

  function attachScrollReopenListener() {
    if (scrollReopenAttached || formSubmitted) return;

    window.addEventListener("scroll", onScrollForReopen, {
      passive: true,
      capture: true,
    });
    document.addEventListener("scroll", onScrollForReopen, {
      passive: true,
      capture: true,
    });
    window.addEventListener("wheel", onScrollForReopen, { passive: true });
    window.addEventListener("touchmove", onScrollForReopen, { passive: true });

    scrollReopenAttached = true;
  }

  function detachScrollReopenListener() {
    if (!scrollReopenAttached) return;

    window.removeEventListener("scroll", onScrollForReopen, { capture: true });
    document.removeEventListener("scroll", onScrollForReopen, { capture: true });
    window.removeEventListener("wheel", onScrollForReopen);
    window.removeEventListener("touchmove", onScrollForReopen);

    scrollReopenAttached = false;
  }

  function waitForModalClosed(callback, attempt = 0) {
    if (!isModalOpen()) {
      callback();
      return;
    }

    if (attempt >= 30) return;

    window.setTimeout(() => waitForModalClosed(callback, attempt + 1), 50);
  }

  function attachModalVisibilityObserver() {
    const modal = getModal();
    if (!modal || modalVisibilityObserver) return;

    let wasOpen = isModalOpen();

    modalVisibilityObserver = new MutationObserver(() => {
      const openNow = isModalOpen();

      if (wasOpen && !openNow) {
        window.setTimeout(() => {
          if (formSubmitted || closingAfterSuccess) return;
          if (!isModalOpen()) handleCloseWithoutSubmit();
        }, 0);
      }

      wasOpen = openNow;
    });

    modalVisibilityObserver.observe(modal, {
      attributes: true,
      attributeFilter: ["style", "class", "aria-hidden", "hidden"],
    });

    const modalParent = modal.parentElement;
    if (modalParent) {
      modalVisibilityObserver.observe(modalParent, {
        attributes: true,
        attributeFilter: ["style", "class", "aria-hidden", "hidden"],
      });
    }
  }

  function attachDomSuccessObserver() {
    if (domSuccessObserver || formSubmitted) return;

    const placeholder = getMarketoPlaceholder();
    if (!placeholder) return;

    domSuccessObserver = new MutationObserver(() => {
      if (isSuccessStateVisible()) {
        handleFormSuccess("dom-success-state");
      }
    });

    domSuccessObserver.observe(placeholder, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "style",
        "class",
        "hidden",
        "aria-hidden",
        "data-wf-marketo-form-state",
      ],
    });

    if (isSuccessStateVisible()) {
      handleFormSuccess("dom-success-state-initial");
    }
  }

  function marketoFormMatches(form) {
    try {
      if (typeof form?.getId === "function") {
        return String(form.getId()) === FORM_NUMERIC_ID;
      }
    } catch {
      /* ignore */
    }

    try {
      if (typeof form?.getFormElem === "function") {
        const formElem = form.getFormElem();
        const domNode =
          formElem?.[0] || formElem?.get?.(0) || formElem || undefined;

        return domNode?.id === MKTO_FORM_ID;
      }
    } catch {
      /* ignore */
    }

    return false;
  }

  function attachMarketoHooks() {
    if (marketoHooksAttached || formSubmitted) return true;
    if (!window.MktoForms2 || typeof window.MktoForms2.whenReady !== "function") {
      return false;
    }

    marketoHooksAttached = true;

    window.MktoForms2.whenReady((form) => {
      if (!marketoFormMatches(form)) return;

      if (typeof form.onSuccess === "function") {
        form.onSuccess(() => {
          handleFormSuccess("mkto-onSuccess");
          return false;
        });
      }
    });

    return true;
  }

  function pollForFormHooks(startedAt) {
    if (formSubmitted) return;

    if (!domSuccessObserver) attachDomSuccessObserver();
    attachMarketoHooks();

    if (getMarketoForm() && domSuccessObserver) return;

    if (Date.now() - startedAt > MARKETO_POLL_TIMEOUT_MS) return;

    window.setTimeout(() => pollForFormHooks(startedAt), MARKETO_POLL_MS);
  }

  function handleDocumentClick(event) {
    if (!event.target.closest(CLOSE_SELECTOR)) return;

    waitForModalClosed(() => {
      if (formSubmitted || closingAfterSuccess) return;
      handleCloseWithoutSubmit();
    });
  }

  function openModalOnLoad() {
    if (formSubmitted) return;

    window.setTimeout(() => {
      if (formSubmitted || isModalOpen()) return;
      clickOpenTrigger();
    }, AUTO_OPEN_DELAY_MS);
  }

  function init() {
    if (formSubmitted) return;

    document.addEventListener("click", handleDocumentClick, true);
    attachModalVisibilityObserver();
    pollForFormHooks(Date.now());
    openModalOnLoad();
  }

  window.resetCaseIqResearchModalSubmitted = () => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }

    formSubmitted = false;
    awaitingScrollReopen = false;
    closingAfterSuccess = false;
    marketoHooksAttached = false;

    if (domSuccessObserver) {
      domSuccessObserver.disconnect();
      domSuccessObserver = null;
    }

    if (modalVisibilityObserver) {
      modalVisibilityObserver.disconnect();
      modalVisibilityObserver = null;
    }

    detachScrollReopenListener();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
