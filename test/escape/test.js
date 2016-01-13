/*global describe, it, assert */
define('base', function(require) {
  'use strict';

  return function(tagName, renderFn) {
    var proto = Object.create(HTMLElement.prototype);
    proto.createdCallback = require('htemplate')(renderFn);

    document.registerElement(tagName, {
      prototype: proto
    });

    return proto;
  };
});

define('elements', function(require) {
  'use strict';
  var base = require('base'),
      htemplate = require('htemplate');

  var firstProto = base('first-element', function(html) {
    html`<h1>${this.htmlFun}</h1>
         <h2>${htemplate.esc.html(this.htmlFun)}</h2>`;
  });

  firstProto.htmlFun = '<a href="https://github.com?a=b&c=d">Funky\'s link</a>';
});

define(function(require) {
  'use strict';

  require('elements');

  document.getElementById('htemplate-out').innerHTML = `
    <first-element></first-element>
  `;

  describe('Nested custom elements', function() {
    it('Passes props to nested element', function() {
      var h1 = document.querySelector('first-element h1'),
          h2 = document.querySelector('first-element h2');

      assert.equal(h1.textContent, h2.textContent);
    });
  });
});
