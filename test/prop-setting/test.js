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
  var base = require('base');

  var firstProto = base('first-element', function(html) {
    html`<second-element model="${this.model}"
                         options="${this.options}"
                         sequence="${this.sequence}"
                         color="${this.color}"
                         size="${this.size}"><second-element>`;
  });

  firstProto.model = {
    name: 'firstElementModel'
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
      var first = document.querySelector('first-element'),
          second = document.querySelector('second-element');

      assert.equal(first.model, second._model);
      assert.equal('firstElementModel', second._model.name);
      assert.equal(first.options, second.options);
      assert.equal('all', second.options.actions);
      assert.equal(first.sequence, second.sequence);
      assert.equal(1, second.sequence[0]);
      assert.equal(first.color, second.color);
      assert.equal('blue', second.color);
      assert.equal(first.size, second.size);
      assert.equal(42, second.size);
    });
  });
});
