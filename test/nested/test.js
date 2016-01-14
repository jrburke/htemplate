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

  var datas = [
    {
      model: {
        name: 'firstElementModel'
      },
      format: {
        large: 'small',
        toString: function() {
          return this.large;
        }
      },
      options: {
        actions: 'all'
      },
      sequence: [1, 2, 3],
      color: 'blue',
      thing: {
        kind: 'very'
      },
      size: 42
    },
    {
      model: {
        name: 'secondElementModel'
      },
      format: {
        large: 'medium',
        toString: function() {
          return this.large;
        }
      },
      options: {
        actions: 'some'
      },
      sequence: [4, 5, 6],
      color: 'green',
      thing: {
        kind: 'little'
      },
      size: 52
    },
    {
      model: {
        name: 'thirdElementModel'
      },
      format: {
        large: 'large',
        toString: function() {
          return this.large;
        }
      },
      options: {
        actions: 'none'
      },
      sequence: [7, 8, 9],
      color: 'red',
      thing: {
        kind: 'mid'
      },
      size: 62
    }
  ];

  var proto = Object.create(HTMLElement.prototype);
  proto.createdCallback = function() {
    var index = this.dataset.index;
    if (index) {
      index = parseInt(index, 10);
    } else {
      index = 0;
    }
    this.data = datas[index];
    this.render();
  };

  proto.render = require('htemplate')( function(html) {
    html`<second-element ${ this.hasAttribute('nested') ? 'nested': ''}
                         model="${this.data.model}"
                         data-format="${this.data.format}"
                         options="${this.data.options}"
                         sequence="${this.data.sequence}"
                         color="${this.data.color}"
                         do-something-here="${this.data.thing}"
                         size="${this.data.size}"></second-element>`;
  });

  document.registerElement('first-element', {
    prototype: proto
  });

  var secondProto = base('second-element', function(html) {
    html`<h1>second-element</h1>`;
    if (this.hasAttribute('nested')) {
      html`<first-element></first-element>`;
    }
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
    <first-element data-index="1" nested></first-element>
    <first-element data-index="2"></first-element>
  `;

  describe('Nested custom elements', function() {
    it('Passes props to nested element', function() {
      var first0 = document.querySelector('second-element first-element'),
          first1 = document.querySelector('first-element[data-index="1"]'),
          first2 = document.querySelector('first-element[data-index="2"]'),
          second0 =
          document.querySelector('second-element>first-element>second-element'),
          second1 =
          document.querySelector('first-element[data-index="1"]>second-element'),
          second2 =
          document.querySelector('first-element[data-index="2"]>second-element');


      //first0 comparison
      assert.equal(first0.data.model, second0._model);
      assert.equal('firstElementModel', second0._model.name);

      assert.equal(undefined, second0['data-format']);
      assert.equal(undefined, second0.dataFormat);
      assert.equal('small', second0.dataset.format);

      assert.equal(first0.data.options, second0.options);
      assert.equal('all', second0.options.actions);

      assert.equal(first0.data.sequence, second0.sequence);
      assert.equal(1, second0.sequence[0]);

      assert.equal(first0.data.color, second0.getAttribute('color'));
      assert.equal('blue', second0.getAttribute('color'));

      assert.equal('very', second0.kind);

      assert.equal(first0.data.size, second0.size);
      assert.equal(42, second0.size);

      //first1 comparison
      assert.equal(first1.data.model, second1._model);
      assert.equal('secondElementModel', second1._model.name);

      assert.equal(undefined, second1['data-format']);
      assert.equal(undefined, second1.dataFormat);
      assert.equal('medium', second1.dataset.format);

      assert.equal(first1.data.options, second1.options);
      assert.equal('some', second1.options.actions);

      assert.equal(first1.data.sequence, second1.sequence);
      assert.equal(4, second1.sequence[0]);

      assert.equal(first1.data.color, second1.getAttribute('color'));
      assert.equal('green', second1.getAttribute('color'));

      assert.equal('little', second1.kind);

      assert.equal(first1.data.size, second1.size);
      assert.equal(52, second1.size);

      //first2 comparison
      assert.equal(first2.data.model, second2._model);
      assert.equal('thirdElementModel', second2._model.name);

      assert.equal(undefined, second2['data-format']);
      assert.equal(undefined, second2.dataFormat);
      assert.equal('large', second2.dataset.format);

      assert.equal(first2.data.options, second2.options);
      assert.equal('none', second2.options.actions);

      assert.equal(first2.data.sequence, second2.sequence);
      assert.equal(7, second2.sequence[0]);

      assert.equal(first2.data.color, second2.getAttribute('color'));
      assert.equal('red', second2.getAttribute('color'));

      assert.equal('mid', second2.kind);

      assert.equal(first2.data.size, second2.size);
      assert.equal(62, second2.size);
    });
  });
});
