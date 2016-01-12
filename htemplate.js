/*
 * htemplate, version 0.0.9.
 * Copyright 2015-2016, Mozilla Foundation. Apache 2.0 License.
 */
(function(factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof module === 'object' && typeof exports === 'object') {
    module.exports = factory();
  }
}(function() {
  'use strict';

  var idCounter = 0,
      propRegExp = /\s([A-Za-z-]+)="$/,
      slice = Array.prototype.slice;

  // Keep this constructor private, do not expose it directly to require
  // creation of instances via the esc API.
  function EscapedValue(value) {
    this.escapedValue = value;
  }

  // Taken from mozilla-b2g/gaia's shared/js/sanitizer.
  var entityRegExp = /[&<>"'/]/g;
  var entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&apos;',
    '/': '&#x2F;'
  };
  function getEntity(s) {
    return entities[s];
  }

  // Functions to properly escape string contents. Default one escapes HTML.
  function esc(value) {
    return value.replace(entityRegExp, getEntity);
  }

  esc.html = function(value) {
    return new EscapedValue(esc(value));
  };

  function makeTagged(options) {
    options = options || {};

    var dataId = (idCounter++),
        fnCounter = 0,
        parts = [],
        bindingId,
        bindings = {};

    return function htagged(strings, ...values) {
      // If no strings passed, the return the results.
      if (!strings) {
        var result = {
          bindingId: dataId,
          bindings: bindings,
          text: parts.join('')
        };
        fnCounter = 0;
        parts = [];
        bindingId = undefined;
        bindings = {};

        return result;
      }

      strings.forEach(function(str, i) {
        var value;
        // Have a
        if (i < values.length) {
          value = values[i];
          if (!options.toStringAll &&
              typeof value !== 'string' && typeof value !== 'number' &&
              !(value instanceof EscapedValue)) {
            // Check for propName=" as the end of the previous string, if so, it
            // is a binding to a property.
            var match = propRegExp.exec(str);
            if (match) {
              bindingId = dataId;
              var propId = 'id' + (fnCounter++);
              bindings[propId] = {
                value: value,
                propName: match[1]
              };

              value = propId;

              // Swap out the attribute name to be specific to this htagged ID,
              // to make query selection faster and only targeted to this
              // htagged.
              str = str.substring(0, match.index) + ' data-hbinding' +
                    bindingId + '="';
            }
          }
        }

        parts.push(str);

        if (value) {
          if (value instanceof EscapedValue) {
            value = value.escapedValue;
          } else {
            if (typeof value !== 'string') {
              value = String(value);
            }
            parts.push(esc(value));
          }
        }
      });
    };
  }

  function makeTagResultFn(fn, options) {
    var taggedFn = makeTagged(options);

    return function renderToDom() {
      fn.call(this, taggedFn, esc);
      return taggedFn();
    };
  }

  function applyBindings(element, tagResult) {
    var bindingId = tagResult.bindingId;
    if (bindingId) {
      var nodeList = element
                     .querySelectorAll('[data-hbinding' + bindingId + ']');

      slice.call(nodeList, 0)
      .forEach(function(node) {
        debugger;
        var propId = node.dataset['hbinding' + bindingId],
            binding = tagResult.bindings[propId];

        delete node.dataset['hbinding' + bindingId];

        if (!binding) {
          console.error('Cound not find binding ' + propId);
          return;
        }

        var propName = binding.propName;
        if (propName) {
          if (typeof node[propName] === 'function') {
            node[propName](binding.value);
          } else {
            node[propName] = binding.value;
          }
        }
      });
    }
  }

  function htemplate(renderFn, verifyFn, options) {
    var tagResultFn = makeTagResultFn(renderFn, options);

    return function htemplateToDom() {
      var tagResult = tagResultFn.call(this);

      // If there is no result text, then do not mess with the innerHTML.
      if (tagResult.text || this.htemplateAllowEmptyText) {

        // The verifyFn could decide to modify the tagResult object.
        if (verifyFn) {
          verifyFn(this, tagResult);
        }

        this.innerHTML = tagResult.text;

        applyBindings(this, tagResult);
      }
    };
  }

  htemplate.makeTagResultFn = makeTagResultFn;
  htemplate.applyBindings = applyBindings;
  htemplate.esc = esc;
  htemplate.makeTagged = makeTagged;

  return htemplate;
}));
