/*global describe, it, assert */
define('base', function(require) {
  'use strict';

  return function(tagName, renderFn) {
    var proto = Object.create(HTMLElement.prototype);
    proto.createdCallback = require('htemplate')(renderFn, null, {
      // This is the unique thing about this test.
      toStringAll: true
    });

    document.registerElement(tagName, {
      prototype: proto
    });

    return proto;
  };
});

define('elements', function(require) {
  'use strict';
  var base = require('base');

  var firstProto = base('first-element', function(html) {
    html`<second-element model="${this.model}"
                         options="${this.options}"
                         sequence="${this.sequence}"
                         color="${this.color}"
                         size="${this.size}"></second-element>`;
  });

  firstProto.model = {
    name: 'firstElementModel',
    toString: function() {
      return 'model tostring: firstElementModel'
    }
  };
  firstProto.options = {
    actions: 'all'
  };
  firstProto.sequence = [1, 2, 3];
  firstProto.color = 'blue';
  firstProto.size = 42;

  var secondProto = base('second-element', function(html) {
    html`<h1>second-element</h1>`;
  });

  secondProto.model = function(model) {
    this._model = model;
  }
});

define(function(require) {
  'use strict';

  require('elements');

  document.getElementById('htemplate-out').innerHTML = `
    <first-element></first-element>
  `;

  describe('Nested custom elements', function() {
    it('Passes props to nested element', function() {
      var second = document.querySelector('second-element');

      assert.equal(undefined, second._model);
      assert.equal('model tostring: firstElementModel',
                   second.getAttribute('model'));

      assert.equal(undefined, second.options);
      assert.equal('[object Object]', second.getAttribute('options'));

      assert.equal(undefined, second.sequence);
      assert.equal('1,2,3', second.getAttribute('sequence'));

      assert.equal(undefined, second.color);
      assert.equal('blue', second.getAttribute('color'));

      assert.equal(undefined, second.size);
      assert.equal('42', second.getAttribute('size'));
    });
  });
});
