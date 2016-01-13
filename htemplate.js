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


  function makeReplaceFunction(values) {
    return function(match, id) {
      values.push(id);
      return '';
    };
  }

  var tagRegExp = /<[^>]+>/g;

  /**
   * Split up the text by < and > tag segments, look for
   * data-hbinding(bindingId) attributes, and group the values into one
   * data-hbinding attribute since the browser will discard the same named
   * attributes just keeping the first one.
   */
  function groupBindings(bindingId, text) {
    var match,
        attrName = 'data-hbinding' + bindingId,
        attrRegExp = new RegExp(attrName + '="([^"]+)"', 'g'),
        result = '',
        index = 0;

    tagRegExp.lastIndex = 0;

    while ((match = tagRegExp.exec(text))) {
      if (match.index !== index) {
        result += text.substring(index, match.index);
      }
      index = tagRegExp.lastIndex;

      var tag = match[0];
      var dataIndex = tag.indexOf(attrName);
      if (dataIndex === -1) {
        // No bindings, just write out the tag.
        result += tag;
      } else {
        // The + 2 is to move the index past the double quote that starts the
        // attribute value.
        dataIndex += attrName.length + 2;
        var quoteIndex = tag.indexOf('"', dataIndex);
        if (quoteIndex === -1) {
          throw new Error('Unexpected HTML, expecting attribute values to be ' +
                          'surrounded by double quotes.');
        }

        var values = [tag.substring(dataIndex, quoteIndex)];

        var tagSegment = tag.substring(quoteIndex);

        attrRegExp.lastIndex = 0;

        tagSegment = tagSegment.replace(attrRegExp,
                                        makeReplaceFunction(values));

        result += tag.substring(0, dataIndex) + values.join(',') + tagSegment;
      }
    }

    if (index < text.length - 1) {
      result += text.substring(index, text.length);
    }

    return result;
  }

  function makeTagged(options) {
    options = options || {};

    var parts, fnCounter, bindingId, bindings;

    function reset() {
      parts = [];
      fnCounter = 0;
      bindingId = bindings = undefined;
    }

    reset();

    function htagged(strings, ...values) {
      strings.forEach(function(str, i) {
        // If there is no following value, at the end, just return;
        if (i >= values.length) {
          parts.push(str);
          return;
        }

        var value = values[i];
        if (!options.toStringAll &&
            typeof value !== 'string' &&
            !(value instanceof EscapedValue)) {
          // Check for propName=" as the end of the previous string, if so, it
          // is a binding to a property.
          var match = propRegExp.exec(str);
          if (match) {
            if (bindingId === undefined) {
              bindingId = (idCounter++);
            }

            var propId = 'id' + (fnCounter++);

            if (!bindings) {
              bindings = {};
            }

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

        parts.push(str);

        if (value instanceof EscapedValue) {
          value = value.escapedValue;
        } else {
          if (typeof value !== 'string') {
            value = String(value);
          }
          value = esc(value);
        }
        parts.push(value);
      });
    }

    htagged.done = function() {
      var text = parts.join('');

      if (bindingId !== undefined) {
        // Process the text to replace multiple data-hbinding attributes with
        // one that groups the values. Otherwise the browser will just keep the
        // first value.
        text = groupBindings(bindingId, text);
      }

      var result = {
        text: text
      };

      if (bindingId !== undefined) {
        result.bindingId = bindingId;
        result.bindings = bindings;
      }

      reset();

      return result;
    };

    return htagged;
  }

  function makeTagResultFn(fn, options) {
    var taggedFn = makeTagged(options);

    return function renderToDom() {
      fn.call(this, taggedFn, esc);
      return taggedFn.done();
    };
  }

  function applyBindings(element, tagResult) {

    var bindingId = tagResult.bindingId,
        query = '[data-hbinding' + bindingId + ']';

    if (bindingId !== undefined) {
      var nodeList = element
                     .querySelectorAll(query);

      slice.call(nodeList, 0).forEach(function(node) {
        var propIds = node.dataset['hbinding' + bindingId];
        delete node.dataset['hbinding' + bindingId];

        propIds.split(',').forEach(function(propId) {
          var binding = tagResult.bindings[propId];
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
