(() => {
  if (window.__caseIqModalCookieInitialized) return;
  window.__caseIqModalCookieInitialized = true;

  const COOKIE_NAME = "caseiq_modal_dismissed";
  const COOKIE_VALUE = "true";
  const COOKIE_HOURS = 24;
  const AUTO_OPEN_DELAY_MS = 300;
  const OPEN_SELECTOR = '[trigger-modal="open"]';
  const CLOSE_SELECTOR = '[trigger-modal="close"]';

  function hasDismissedModal() {
    return document.cookie
      .split("; ")
      .some((cookie) => cookie === `${COOKIE_NAME}=${COOKIE_VALUE}`);
  }

  function setDismissedModalCookie() {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + COOKIE_HOURS);

    document.cookie =
      `${COOKIE_NAME}=${COOKIE_VALUE}; ` +
      `expires=${expiresAt.toUTCString()}; path=/; SameSite=Lax`;
  }

  function clearDismissedModalCookie() {
    document.cookie =
      `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  }

  function openModalIfNeeded() {
    if (hasDismissedModal()) return;

    const openTrigger = document.querySelector(OPEN_SELECTOR);
    if (!openTrigger) return;

    window.setTimeout(() => {
      if (hasDismissedModal()) return;
      openTrigger.click();
    }, AUTO_OPEN_DELAY_MS);
  }

  function handleCloseClick(event) {
    const closeTrigger = event.target.closest(CLOSE_SELECTOR);
    if (!closeTrigger) return;

    setDismissedModalCookie();
  }

  function initModalCookie() {
    document.addEventListener("click", handleCloseClick);
    openModalIfNeeded();
  }

  // Expose a reset helper so the cookie can be cleared from the console while testing.
  window.resetCaseIqModalCookie = clearDismissedModalCookie;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initModalCookie, {
      once: true,
    });
  } else {
    initModalCookie();
  }
})();
