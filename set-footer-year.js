(() => {
  if (window.__caseIqFooterNoteYearInitialized) return;
  window.__caseIqFooterNoteYearInitialized = true;

  const FOOTER_NOTE_SELECTOR = "[footer-note]";

  function updateFooterNoteYear() {
    const year = new Date().getFullYear();
    const footerNoteText = `© ${year} Case IQ, Inc. All Rights Reserved.`;
    const footerNotes = document.querySelectorAll(FOOTER_NOTE_SELECTOR);

    footerNotes.forEach((footerNote) => {
      footerNote.textContent = footerNoteText;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateFooterNoteYear, {
      once: true,
    });
  } else {
    updateFooterNoteYear();
  }
})();
