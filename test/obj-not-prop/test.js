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
    html`${this.formatHtml}
         ${this.thing}
         <second-element model="${this.model}"
                         options="${this.options}"
                         sequence="${this.sequence}"
                         color="${this.color}"
                         do-something-here="${this.thing}"
                         size="${this.size}">${this.format}</second-element>`;
  });

  firstProto.model = {
    name: 'firstElementModel'
  };
  firstProto.format = {
    large: 'small',
    toString: function() {
      return this.large;
    }
  };
  firstProto.formatHtml = {
    large: 'small',
    toString: function() {
      return '<b>' + this.large + '</b>';
    }
  };
  firstProto.options = {
    actions: 'all'
  };
  firstProto.sequence = [1, 2, 3];
  firstProto.color = 'blue';
  firstProto.thing = {
    kind: 'very'
  };
  firstProto.size = 42;

  var secondProto = base('second-element', function() {
    // Purposely do not do anything here.
  });

  secondProto.model = function(model) {
    this._model = model;
  };

  secondProto.doSomethingHere = function(obj) {
    this.kind = obj.kind;
  };
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

      var textValue = first.childNodes[0].nodeValue;

      assert.equal(true, textValue.indexOf('<b>small</b>') !== -1);
      assert.equal(true, textValue.indexOf('[object Object]') !== -1);

      assert.equal(first.model, second._model);
      assert.equal('firstElementModel', second._model.name);

      assert.equal(first.options, second.options);
      assert.equal('all', second.options.actions);

      assert.equal(first.sequence, second.sequence);
      assert.equal(1, second.sequence[0]);

      assert.equal(first.color, second.getAttribute('color'));
      assert.equal('blue', second.getAttribute('color'));

      assert.equal('very', second.kind);

      assert.equal(first.size, second.size);
      assert.equal(42, second.size);

      assert.equal('small', second.textContent);
    });
  });
});
