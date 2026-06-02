/**
 * Case IQ — Gated resource: redirect after Marketo form 2761 submit
 *
 * Pair with gated-resource-store.js on the article page (stores redirect-to in sessionStorage).
 *
 * On successful submit of form #mktoForm_2761:
 * 1. Reads caseiq_gated_resource_redirect_to from sessionStorage
 * 2. Redirects the browser to that URL (blocks Marketo follow-up URL when present)
 *
 * Paste in Webflow: Page Settings → Custom Code → Before </body>
 * (Same page as the inline Marketo form, or site-wide if the form only appears on gated flows.)
 */
(() => {
  if (window.__caseIqGatedResourceMarketoRedirectInitialized) return;
  window.__caseIqGatedResourceMarketoRedirectInitialized = true;

  const FORM_NUMERIC_ID = "2761";
  const MKTO_FORM_ID = `mktoForm_${FORM_NUMERIC_ID}`;
  const REDIRECT_STORAGE_KEY = "caseiq_gated_resource_redirect_to";
  const PLACEHOLDER_SELECTOR = `[data-wf-marketo-form-id="${FORM_NUMERIC_ID}"]`;
  const SUCCESS_SELECTOR =
    ".wf_mkto_success, [data-wf-marketo-form-state='success']";
  const REDIRECT_DELAY_MS = 300;
  const MARKETO_POLL_MS = 500;
  const MARKETO_POLL_TIMEOUT_MS = 30000;

  let redirectHandled = false;
  let marketoHooksAttached = false;
  let domSuccessObserver = null;

  function readRedirectUrl() {
    if (typeof window.getCaseIqGatedResourceRedirectTo === "function") {
      return window.getCaseIqGatedResourceRedirectTo() || "";
    }

    try {
      return window.sessionStorage.getItem(REDIRECT_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function resolveRedirectUrl(url) {
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

  function getFormPlaceholder() {
    const byId = document.querySelector(`#${MKTO_FORM_ID}`);
    if (byId) {
      return (
        byId.closest(PLACEHOLDER_SELECTOR) ||
        byId.closest("[data-wf-marketo-form-id]") ||
        byId.parentElement
      );
    }

    return document.querySelector(PLACEHOLDER_SELECTOR);
  }

  function isSuccessStateVisible() {
    const root = getFormPlaceholder();
    if (!root) return false;

    return Array.from(root.querySelectorAll(SUCCESS_SELECTOR)).some((node) =>
      isVisible(node)
    );
  }

  function redirectToStoredUrl(source) {
    if (redirectHandled) return;

    const targetUrl = resolveRedirectUrl(readRedirectUrl());
    if (!targetUrl) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(
          "[CaseIQ Gated Resource] form submitted but no redirect URL in sessionStorage",
          { source, key: REDIRECT_STORAGE_KEY }
        );
      }
      return;
    }

    redirectHandled = true;

    if (typeof console !== "undefined" && console.debug) {
      console.debug("[CaseIQ Gated Resource] redirecting after form submit", {
        source,
        targetUrl,
      });
    }

    window.setTimeout(() => {
      window.location.assign(targetUrl);
    }, REDIRECT_DELAY_MS);
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
    if (marketoHooksAttached || redirectHandled) return true;
    if (!window.MktoForms2 || typeof window.MktoForms2.whenReady !== "function") {
      return false;
    }

    marketoHooksAttached = true;

    window.MktoForms2.whenReady((form) => {
      if (!marketoFormMatches(form)) return;

      if (typeof form.onSuccess !== "function") return;

      form.onSuccess(() => {
        redirectToStoredUrl("mkto-onSuccess");
        return false;
      });
    });

    return true;
  }

  function attachDomSuccessObserver() {
    if (domSuccessObserver || redirectHandled) return;

    const placeholder = getFormPlaceholder();
    if (!placeholder) return;

    domSuccessObserver = new MutationObserver(() => {
      if (isSuccessStateVisible()) {
        redirectToStoredUrl("dom-success-state");
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
      redirectToStoredUrl("dom-success-state-initial");
    }
  }

  function pollForFormHooks(startedAt) {
    if (redirectHandled) return;

    attachDomSuccessObserver();
    attachMarketoHooks();

    if (getFormPlaceholder() && domSuccessObserver) return;

    if (Date.now() - startedAt > MARKETO_POLL_TIMEOUT_MS) return;

    window.setTimeout(() => pollForFormHooks(startedAt), MARKETO_POLL_MS);
  }

  function init() {
    pollForFormHooks(Date.now());
  }

  window.resetCaseIqGatedResourceMarketoRedirect = function resetCaseIqGatedResourceMarketoRedirect() {
    redirectHandled = false;
    marketoHooksAttached = false;

    if (domSuccessObserver) {
      domSuccessObserver.disconnect();
      domSuccessObserver = null;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
