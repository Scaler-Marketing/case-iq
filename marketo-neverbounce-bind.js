(function () {
  var LOG = "[CaseIQ NeverBounce]";
  var emailSelector = 'form.mktoForm input[name="Email"]';
  var registered = new WeakSet();
  var results = new WeakMap();

  function log() {
    console.log.apply(console, [LOG].concat([].slice.call(arguments)));
  }

  function isAccepted(result) {
    if (!result || typeof result.is !== "function") return false;
    return result.is(_nb.settings.getAcceptedStatusCodes());
  }

  function trackField(field) {
    if (results.has(field)) return;

    field.addEventListener("nb:result", function (e) {
      results.set(field, isAccepted(e.detail.result));
    });

    field.addEventListener("nb:clear", function () {
      results.delete(field);
    });
  }

  function registerEmailFields() {
    if (!window._nb || !_nb.fields) return;

    document.querySelectorAll(emailSelector).forEach(function (field) {
      if (registered.has(field)) return;

      trackField(field);
      _nb.fields.registerListener(field, true);
      registered.add(field);
      log("Registered email field", field.id, field.form && field.form.id);
    });
  }

  function emailIsReady(field) {
    if (!field) return true;
    if (!results.has(field)) return false;
    return results.get(field) === true;
  }

  function hookMarketoForms() {
    if (!window.MktoForms2 || typeof MktoForms2.whenReady !== "function") {
      return false;
    }

    MktoForms2.whenReady(function (form) {
      registerEmailFields();

      if (typeof form.onSubmit !== "function") return;

      form.onSubmit(function () {
        var formEl = form.getFormElem()[0];
        var emailField = formEl ? formEl.querySelector('input[name="Email"]') : null;

        if (!emailField) return true;

        if (!emailIsReady(emailField)) {
          log("Blocked Marketo submit: email not verified/accepted", emailField.value);
          emailField.focus();
          return false;
        }

        log("Allowed Marketo submit", emailField.value);
        return true;
      });
    });

    return true;
  }

  function boot() {
    registerEmailFields();
    hookMarketoForms();
  }

  boot();

  if (!hookMarketoForms()) {
    var tries = 0;
    var poll = window.setInterval(function () {
      tries += 1;
      registerEmailFields();
      if (hookMarketoForms() || tries > 60) {
        window.clearInterval(poll);
      }
    }, 500);
  }

  var observer = new MutationObserver(function () {
    registerEmailFields();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("load", boot);
})();
