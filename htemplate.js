/*
 * htemplate, version 0.0.9.
 * Copyright 2015-2016, Mozilla Foundation. Apache 2.0 License.
 */
(function(root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.htemplate = factory();
  }
}(this, function() {
  'use strict';

  var idCounter = 0,
      propRegExp = /\s([A-Za-z-]+)="$/,
      slice = Array.prototype.slice,
      tagRegExp = /<[^>]+>/g;

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

  // HTML escapes the value string.
  function esc(value) {
    return value.replace(entityRegExp, getEntity);
  }

  // Escapes HTML, and returns as an EscapedValue, so that if used in the
  // template, it is not double-escaped.
  esc.html = function(value) {
    return new EscapedValue(esc(value));
  };

  // Helper that just creates a function to be passed to a replace call inside
  // a loop.
  function makeReplaceFunction(values) {
    return function(match, id) {
      values.push(id);
      return '';
    };
  }

  // Split up the text by < and > tag segments, look for
  // data-htemplateprop(propId) attributes, and group the values into one
  // data-htemplateprop attribute since the browser will discard the same named
  // attributes just keeping the first one.
  function groupProps(propId, text) {
    var match,
        attrName = 'data-htemplateprop' + propId,
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
        // No props, just write out the tag.
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

  // Creates html() function that can be used for the tagged template string.
  function makeHtml(options) {
    options = options || {};

    var parts, fnCounter, propId, props;

    // Tagged function can be called multiple times, need to generate unique
    // IDs and track unique values per full use (until html.done is called).
    function reset() {
      parts = [];
      fnCounter = 0;
      propId = props = undefined;
    }
    reset();

    // The html() function used for the tagged template string. Call
    // html.done() to get the final string result.
    function html(strings, ...values) {
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
          // is a name to a property to be set/called later with the value.
          var match = propRegExp.exec(str);
          // data-prop should go the string path, since that is a defined HTML
          // API that maps to element.dataset.prop.
          if (match && match[1].indexOf('data-') !== 0) {
            if (propId === undefined) {
              propId = (idCounter++);
            }

            var propValueId = 'id' + (fnCounter++);

            if (!props) {
              props = {};
            }

            var propName = match[1];
            // Convert a-prop-name to aPropName
            if (propName.indexOf('-') !== -1) {
              propName = propName.split('-').map(function(part, partIndex) {
                return partIndex === 0 ?
                       part : part.charAt(0).toUpperCase() + part.substring(1);
              }).join('');
            }

            props[propValueId] = {
              value: value,
              propName: propName
            };

            value = propValueId;

            // Swap out the attribute name to be specific to this html() use,
            // to make query selection faster and targeted.
            str = str.substring(0, match.index) + ' data-htemplateprop' +
                  propId + '="';
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

    // Generates the final response by concatenating the previous html`` calls
    // into the final result.
    html.done = function() {
      var text = parts.join('');

      if (propId !== undefined) {
        // Process the text to replace multiple data-htemplateprop attributes
        // with one that groups the values. Otherwise the browser will just keep
        // the first value.
        text = groupProps(propId, text);
      }

      var result = {
        text: text
      };

      if (propId !== undefined) {
        result.propId = propId;
        result.props = props;
      }

      reset();

      return result;
    };

    return html;
  }

  // Creates the function that will run the passed in fn function, passing the
  // html() function to that so it can build up the HTML string. Then calls
  // html.done() to get the final tag result.
  function makeTagResultFn(fn, options) {
    var htmlFn = makeHtml(options);

    return function htmlToTagReult() {
      fn.call(this, htmlFn, esc);
      return htmlFn.done();
    };
  }

  // Calls properties on element from the tagResult. Only useful if manually
  // calling after calling the function returned from makeTagResultFn.
  function applyProps(element, tagResult) {
    var propId = tagResult.propId,
        query = '[data-htemplateprop' + propId + ']';

    if (propId !== undefined) {
      var nodeList = element
                     .querySelectorAll(query);

      slice.call(nodeList, 0).forEach(function(node) {
        var propIds = node.dataset['htemplateprop' + propId];
        delete node.dataset['htemplateprop' + propId];

        propIds.split(',').forEach(function(propValueId) {
          var propValue = tagResult.props[propValueId];
          if (!propValue) {
            console.error('Cound not find value for ' + propValueId);
            return;
          }

          var propName = propValue.propName;
          if (propName) {
            if (typeof node[propName] === 'function') {
              node[propName](propValue.value);
            } else {
              node[propName] = propValue.value;
            }
          }
        });
      });
    }
  }

  // The main public API
  function htemplate(renderFn, options) {
    options = options || {};
    var tagResultFn = makeTagResultFn(renderFn, options),
        element = options.element,
        verifyFn = options.verifyFn;

    return function htmlToDom() {
      var tagResult = tagResultFn.call(this);

      // If there is no result text, then do not mess with the innerHTML.
      if (tagResult.text || this.htemplateAllowEmptyText) {

        // The verifyFn could decide to modify the tagResult object.
        if (verifyFn) {
          verifyFn.call(this, tagResult);
        }

        var elementObj = this;
        if (element) {
          elementObj = typeof element === 'function' ?
                       element.call(this) : element;
        }
        elementObj.innerHTML = tagResult.text;

        applyProps(this, tagResult);
      }
    };
  }

  // These are only useful to use if you want to combine these sub-functions in
  // a different way than htemplate does by default.
  htemplate.makeTagResultFn = makeTagResultFn;
  htemplate.applyProps = applyProps;
  htemplate.esc = esc;
  htemplate.makeHtml = makeHtml;

  return htemplate;
}));
