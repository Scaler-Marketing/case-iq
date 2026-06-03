(function (global, factory) {
    // UMD pattern: support CommonJS, AMD, and global variables.
    if (typeof exports === "object" && typeof module === "object") {
      module.exports = factory();
    } else if (typeof define === "function" && define.amd) {
      define([], factory);
    } else if (typeof exports === "object") {
      exports.WebflowTools = factory();
    } else {
      global.WebflowTools = factory();
    }
  })(self, function () {
    "use strict";

    // Module definitions.
    var modules = {
      578: function (module, exports) {
        Object.defineProperty(exports, "__esModule", { value: true });
        // Attributes used in the HTML for the custom element and copy functionality.
        exports.COPY_ATTR = "r-copy-to-clipboard";
        exports.CUSTOM_ELEMENT_ATTR = "custom-element";
      },
    };

    // Module cache.
    var installedModules = {};

    // Custom require function.
    function __webpack_require__(moduleId) {
      if (installedModules[moduleId] !== undefined) {
        return installedModules[moduleId].exports;
      }
      var module = (installedModules[moduleId] = {
        exports: {},
      });
      modules[moduleId](module, module.exports, __webpack_require__);
      return module.exports;
    }

    // Main module object.
    var mainModule = {};

    (function () {
      Object.defineProperty(mainModule, "__esModule", { value: true });
      var config = __webpack_require__(578);

      /**
       * Handles copying text to clipboard when an element is clicked.
       * Behavior:
       * - If the element has a custom selector (via the CUSTOM_ELEMENT_ATTR), it copies the innerText of that element.
       * - Otherwise, if the COPY_ATTR value is:
       *    - "url" (case-insensitive): copies the current window location URL.
       *    - "1": copies the element's own innerText.
       *    - Any other value: copies that value directly.
       */
      function copyToClipboard() {
        // Get optional custom element selector and copy attribute.
        var customSelector = this.getAttribute(config.CUSTOM_ELEMENT_ATTR);
        var copyAttr = this.getAttribute(config.COPY_ATTR);

        if (copyAttr) {
          var textToCopy;

          if (customSelector) {
            // Use the text from the custom element.
            var targetElement = document.querySelector(customSelector);
            textToCopy = targetElement ? targetElement.innerText : "";
          } else {
            // Determine what to copy based on the attribute value.
            if (copyAttr.toLowerCase() === "url") {
              textToCopy = window.location.href;
            } else if (copyAttr === "1") {
              textToCopy = this.innerText;
            } else {
              textToCopy = copyAttr;
            }
          }

          // Create a temporary input element to copy the text.
          var input = document.createElement("input");
          document.body.appendChild(input);
          input.value = textToCopy;
          input.select();
          document.execCommand("copy");
          document.body.removeChild(input);
        }
      }

      // Add click event listeners to all elements with the COPY_ATTR.
      var copyElements = document.querySelectorAll("[" + config.COPY_ATTR + "]");
      copyElements.forEach(function (element) {
        element.addEventListener("click", copyToClipboard);
      });
    })();

    return mainModule;
  });
