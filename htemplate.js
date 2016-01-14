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

  /**
   * HTML escapes the value string.
   */
  function esc(value) {
    return value.replace(entityRegExp, getEntity);
  }

  /**
   * Escapes HTML, and returns as an EscapedValue, so that if used in the
   * template, it is not double-escaped.
   */
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

  /**
   * Split up the text by < and > tag segments, look for
   * data-htemplateprop(propId) attributes, and group the values into one
   * data-htemplateprop attribute since the browser will discard the same named
   * attributes just keeping the first one.
   */
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

  /**
   * Creates the html() function that can be used for the tagged template
   * string.
   */
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
          if (match) {
            if (propId === undefined) {
              propId = (idCounter++);
            }

            var propValueId = 'id' + (fnCounter++);

            if (!props) {
              props = {};
            }

            props[propValueId] = {
              value: value,
              propName: match[1]
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
    // into the final result, and groups and property calls into one HTML
    // attribute within a tag, if there are any. Returns the info needed to
    // apply the props later once the HTML is inserted into the DOM.
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

  /**
   * Creates the function that will run the passed in fn function, passing
   * the html() function to that fn for use in building up the HTML string.
   * Then calls html.done() to te the final tag result.
   * @param  {Function} fn the function that will use the html() function.
   * @param  {Object} [options] options to control the behavior. The only option
   *          at the momenet is ""
   * @returns  {Object} tag result option with these properties:
   * - text: the HTML string with the generated properties.
   * - propId: A unique ID used to bind the prop calls later, if property calls
   *   were used in the template. Only useful if manually calling applyProps().
   * - props: An object that holds the property calls to do. Only useful if
   *   manually calling applyProps().
   */
  function makeTagResultFn(fn, options) {
    var htmlFn = makeHtml(options);

    return function htmlToTagReult() {
      fn.call(this, htmlFn, esc);
      return htmlFn.done();
    };
  }

  /**
   * Calls properties on element from the tagResult. Only useful if manually
   * calling after calling the function returned from makeTagResultFn.
   */
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

  /**
   * The main API: generates a function that can be used to set the innerHTML
   * to the tag result and to optionally call properties on elements if the
   * tagged template use had non-string values in it.
   *
   * The function returned by this function assumes it will be bound to an
   * object, such that it can use `this.innerHTML` to set the innerHTML.
   * @param  {Function} renderFn the function that will use the html() function.
   * @param  {Function} [verifyFn] optional function that can be used to verify,
   *         inspect, or modify the tagResult before the innerHTML is set to
   *         the text value in the tagResult.
   * @param  {Object} [options] optional options object. The only option right
   *         now is "toStringAll", which will force all non-string values that
   *         show up in the tagged template strings to just be toString()'d,
   *         instead of treated as property calls to the elements in the HTML.
   */
  function htemplate(renderFn, verifyFn, options) {
    var tagResultFn = makeTagResultFn(renderFn, options);

    return function htmlToDom() {
      var tagResult = tagResultFn.call(this);

      // If there is no result text, then do not mess with the innerHTML.
      if (tagResult.text || this.htemplateAllowEmptyText) {

        // The verifyFn could decide to modify the tagResult object.
        if (verifyFn) {
          verifyFn(this, tagResult);
        }

        this.innerHTML = tagResult.text;

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
