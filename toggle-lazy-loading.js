
(function () {
  // Upgrade ONLY hero images you've tagged with data-lcp="true".
  // Everything else (incl. other instances of the same component) stays lazy.
  var SELECTOR = '[data-lcp="true"]';

  function upgrade(el) {
    var img = el.tagName === 'IMG' ? el : el.querySelector('img');
    if (!img || img.dataset.lcpDone) return;
    img.dataset.lcpDone = '1';
    img.loading = 'eager';
    img.setAttribute('fetchpriority', 'high');
  }

  // Catch the hero the moment it enters the DOM — early enough to beat the lazy fetch.
  var mo = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches(SELECTOR)) upgrade(n);
        if (n.querySelectorAll) n.querySelectorAll(SELECTOR).forEach(upgrade);
      });
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Final sweep + stop once parsing is done.
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll(SELECTOR).forEach(upgrade);
    mo.disconnect();
  });
})();
