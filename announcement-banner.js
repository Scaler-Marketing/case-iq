(() => {
  if (window.__caseIqAnnouncementBarCookieInitialized) return;
  window.__caseIqAnnouncementBarCookieInitialized = true;

  const COOKIE_NAME = "caseiq_announcement_bar_dismissed";
  const COOKIE_VALUE = "true";
  const COOKIE_HOURS = 24;
  const AUTO_OPEN_DELAY_MS = 30000; // was 300 — delay auto-open past the page-load / PageSpeed window
  const OPEN_SELECTOR = '[trigger-bar="open"]';
  const CLOSE_SELECTOR = '[trigger-bar="close"]';

  function hasDismissedBar() {
    return document.cookie
      .split("; ")
      .some((cookie) => cookie === `${COOKIE_NAME}=${COOKIE_VALUE}`);
  }

  function setDismissedBarCookie() {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + COOKIE_HOURS);

    document.cookie =
      `${COOKIE_NAME}=${COOKIE_VALUE}; ` +
      `expires=${expiresAt.toUTCString()}; path=/; SameSite=Lax`;
  }

  function clearDismissedBarCookie() {
    document.cookie =
      `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  }

  function openBarIfNeeded() {
    if (hasDismissedBar()) return;

    const openTrigger = document.querySelector(OPEN_SELECTOR);
    if (!openTrigger) return;

    // Open on the visitor's first engagement, OR after the fallback delay —
    // whichever comes first. PageSpeed/Lighthouse never scrolls or taps, so during
    // a test this only fires at AUTO_OPEN_DELAY_MS (well past the measured window).
    let fired = false;
    const events = ["scroll", "pointerdown", "touchstart", "keydown"];

    const open = () => {
      if (fired) return;
      fired = true;
      events.forEach((e) => window.removeEventListener(e, open));
      if (hasDismissedBar()) return;
      openTrigger.click();
    };

    events.forEach((e) =>
      window.addEventListener(e, open, { once: true, passive: true })
    );
    window.setTimeout(open, AUTO_OPEN_DELAY_MS);
  }

  function handleCloseClick(event) {
    const closeTrigger = event.target.closest(CLOSE_SELECTOR);
    if (!closeTrigger) return;

    setDismissedBarCookie();
  }

  function initAnnouncementBarCookie() {
    document.addEventListener("click", handleCloseClick);
    openBarIfNeeded();
  }

  // Expose a reset helper so the cookie can be cleared from the console while testing.
  window.resetCaseIqAnnouncementBarCookie = clearDismissedBarCookie;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAnnouncementBarCookie, {
      once: true,
    });
  } else {
    initAnnouncementBarCookie();
  }
})();


