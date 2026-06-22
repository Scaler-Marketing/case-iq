/**
 * Case IQ — Persist UTM parameters until a Marketo form is submitted
 *
 * Behavior:
 * 1. On every page load, captures UTM params from the URL query string.
 *    - If the URL has UTMs, they OVERWRITE what's stored (last-touch attribution).
 *    - If the URL has none, the previously stored UTMs persist untouched.
 * 2. Stored values survive navigation, new tabs, and browser restarts (localStorage).
 * 3. Keeps the UTMs visible in the browser address bar on every page:
 *    - Back-fills the current URL from storage (history.replaceState), and
 *    - Appends the UTMs to internal links so the NEXT page loads with them too.
 * 4. Auto-fills matching hidden fields on any Marketo form on the page so the
 *    values are submitted with the lead.
 * 5. Clears the stored UTMs ONLY when a Marketo form is successfully submitted.
 *
 * Paste in Webflow: Site Settings → Custom Code → Footer (before </body>),
 * so it runs site-wide and persistence works across every page.
 */
(() => {
  if (window.__caseIqUtmPersistInitialized) return;
  window.__caseIqUtmPersistInitialized = true;

  // --- Config -------------------------------------------------------------
  // Params to capture & persist. Add gclid/fbclid/msclkid here if needed —
  // just make sure a hidden field with the same name exists on the Marketo form.
  const TRACKED_PARAMS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];

  const STORAGE_KEY = "caseiq_utm_params";
  const MARKETO_POLL_MS = 500;
  const MARKETO_POLL_TIMEOUT_MS = 30000;

  // Set to false to silence console logging once you're done testing.
  const DEBUG = true;
  const log = (...args) =>
    DEBUG && console.log("[CaseIQ UTM]", ...args);

  // --- Storage helpers ----------------------------------------------------
  function readStored() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function writeStored(values) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      /* storage unavailable (private mode / quota) — fail silently */
    }
  }

  function clearStored() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* no-op */
    }
  }

  // --- Capture from URL ---------------------------------------------------
  // Returns the merged set after applying any UTMs present in the current URL.
  function captureFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const stored = readStored();
    let changed = false;

    TRACKED_PARAMS.forEach((key) => {
      if (params.has(key)) {
        const value = params.get(key).trim();
        if (value) {
          stored[key] = value;
          changed = true;
        }
      }
    });

    if (changed) {
      writeStored(stored);
      log("Captured UTMs from URL → stored:", stored);
    }
    return stored;
  }

  // --- Keep UTMs in the address bar ---------------------------------------
  // Back-fills the current URL from storage so the params show up in the bar
  // even when the visitor arrived on this page without them (e.g. direct nav).
  function syncAddressBar(values) {
    if (!values || !Object.keys(values).length) return;
    if (!window.history || typeof window.history.replaceState !== "function") {
      return;
    }

    let url;
    try {
      url = new URL(window.location.href);
    } catch {
      return;
    }

    let changed = false;
    Object.keys(values).forEach((key) => {
      if (url.searchParams.get(key) !== values[key]) {
        url.searchParams.set(key, values[key]);
        changed = true;
      }
    });

    if (changed) {
      try {
        window.history.replaceState(window.history.state, "", url.toString());
        log("Synced UTMs into address bar:", url.search);
      } catch {
        /* no-op */
      }
    }
  }

  // --- Carry UTMs forward on internal links -------------------------------
  // Appends the stored UTMs to a same-origin link (without clobbering any UTMs
  // the link already specifies on purpose).
  function decorateLink(anchor, values) {
    if (!anchor || !anchor.getAttribute) return;

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    if (/^(mailto:|tel:|javascript:|sms:)/i.test(href)) return;

    let url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch {
      return;
    }

    if (url.origin !== window.location.origin) return; // internal links only
    if (!/^https?:$/.test(url.protocol)) return;

    let changed = false;
    Object.keys(values).forEach((key) => {
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, values[key]);
        changed = true;
      }
    });

    if (changed) anchor.href = url.toString();
  }

  function decorateAllLinks(values) {
    if (!values || !Object.keys(values).length) return;
    document
      .querySelectorAll("a[href]")
      .forEach((anchor) => decorateLink(anchor, values));
    log("Decorated internal links with UTMs.");
  }

  // Catches links added after load (dynamic nav, CMS lists, etc.) at click time.
  function attachLinkClickFallback() {
    document.addEventListener(
      "click",
      (event) => {
        const anchor =
          event.target && event.target.closest
            ? event.target.closest("a[href]")
            : null;
        if (anchor) decorateLink(anchor, readStored());
      },
      true // capture phase — run before the browser follows the link
    );
  }

  // --- Fill Marketo hidden fields -----------------------------------------
  function fillMarketoForm(form, values) {
    if (!values || !Object.keys(values).length) return;

    // Preferred path: Marketo's own setValues API (works on hidden fields).
    if (typeof form?.vals === "function") {
      try {
        form.vals(values);
        return;
      } catch {
        /* fall through to manual fill */
      }
    }

    // Fallback: write directly into the rendered form inputs by name.
    let formEl = null;
    if (typeof form?.getFormElem === "function") {
      const elem = form.getFormElem();
      formEl = elem && elem[0] ? elem[0] : elem;
    }
    if (!formEl || typeof formEl.querySelector !== "function") return;

    Object.keys(values).forEach((name) => {
      const input = formEl.querySelector(`[name="${name}"]`);
      if (input) input.value = values[name];
    });
  }

  // --- Wire up Marketo ----------------------------------------------------
  function attachMarketo() {
    if (!window.MktoForms2 || typeof window.MktoForms2.whenReady !== "function") {
      return false;
    }

    window.MktoForms2.whenReady((form) => {
      // Always fill with the freshest stored values when the form is ready.
      fillMarketoForm(form, readStored());

      if (typeof form.onSuccess === "function") {
        form.onSuccess(() => {
          // Lead captured — UTMs have done their job. Clear them.
          clearStored();
          log("Marketo onSuccess — cleared stored UTMs");
          return true; // keep Marketo's default follow-up/redirect behavior
        });
      }
    });

    return true;
  }

  // Marketo can load after this script. Poll briefly until it's available.
  function waitForMarketo() {
    if (attachMarketo()) return;

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (attachMarketo() || Date.now() - startedAt > MARKETO_POLL_TIMEOUT_MS) {
        window.clearInterval(timer);
      }
    }, MARKETO_POLL_MS);
  }

  // --- Init ---------------------------------------------------------------
  const current = captureFromUrl();
  log(
    Object.keys(current).length
      ? "Active UTMs on this page:"
      : "No UTMs stored yet.",
    current
  );

  // Reflect stored UTMs in the address bar right away.
  syncAddressBar(current);

  function onReady() {
    decorateAllLinks(readStored());
    attachLinkClickFallback();
    waitForMarketo();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
  } else {
    onReady();
  }

  // Expose a couple of helpers for debugging / other scripts.
  window.getCaseIqUtmParams = readStored;
  window.clearCaseIqUtmParams = clearStored;
})();
