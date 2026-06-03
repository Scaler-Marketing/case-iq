(() => {
  "use strict";

  if (window.__finsweetFilterTagHydrationFixInitialized) return;
  window.__finsweetFilterTagHydrationFixInitialized = true;

  var PARAM_ATTRIBUTE = "query-param";

  function getManagedSelects() {
    return Array.from(document.querySelectorAll("select[" + PARAM_ATTRIBUTE + "]"));
  }

  function hasActiveUrlParam(selectElement) {
    var paramName = String(selectElement.getAttribute(PARAM_ATTRIBUTE) || "").trim();
    if (!paramName) return false;

    return !!new URLSearchParams(window.location.search).get(paramName);
  }

  function replayActiveSelectChanges() {
    getManagedSelects()
      .filter(function (selectElement) {
        return (
          hasActiveUrlParam(selectElement) &&
          String(selectElement.value || "").trim() !== ""
        );
      })
      .forEach(function (selectElement) {
        selectElement.dispatchEvent(new Event("change", { bubbles: true }));
      });
  }

  function markListConditionsInteracted(listInstances) {
    (listInstances || []).forEach(function (listInstance) {
      var filters = listInstance && listInstance.filters && listInstance.filters.value;
      if (!filters || !Array.isArray(filters.groups)) return;

      filters.groups.forEach(function (group) {
        (group.conditions || []).forEach(function (condition) {
          var value = condition && condition.value;
          var hasValue = Array.isArray(value)
            ? value.some(function (item) {
                return String(item || "").trim() !== "";
              })
            : String(value || "").trim() !== "";

          if (hasValue) {
            condition.interacted = true;
          }
        });
      });

      listInstance.triggerHook("filter");
    });
  }

  function onListReady(listInstances) {
    window.requestAnimationFrame(function () {
      if (typeof window.syncSelectOptions === "function") {
        window.syncSelectOptions();
      }

      if (typeof window.syncSelectQueryParams === "function") {
        window.syncSelectQueryParams();
      }

      window.requestAnimationFrame(function () {
        replayActiveSelectChanges();
        markListConditionsInteracted(listInstances);
      });
    });
  }

  var finsweetAttributes = window.fsAttributes || window.FinsweetAttributes || [];
  window.fsAttributes = finsweetAttributes;
  window.FinsweetAttributes = finsweetAttributes;

  finsweetAttributes.push(["list", onListReady]);
})();
