/*global describe, it, assert */
var SecondElement;
define('elements', function(require) {
  'use strict';

  // Shadow DOM
  var proto = Object.create(HTMLElement.prototype);
  proto.runId = 0;
  proto.render = require('htemplate')(function(html) {
    this.runId += 1;
    html`<h1 data-runid="${this.runId}">First Element</h1>`;
  }, {
    element: function() { return this.shadowRoot || this.createShadowRoot(); }
  });
  document.registerElement('first-element', {
    prototype: proto
  });

  // Custom component type.
  SecondElement = function(container) {
    this.element = document.createElement('div');
    this.element.dataset.component = 'second-element';
    this.runId = 0;
    this.render();
    container.appendChild(this.element);
  };

  SecondElement.prototype = {
    render: require('htemplate')(function(html) {
      this.runId += 1;
      html`<h1 data-runid="${this.runId}">Second Element</h1>`;
    }, {
      element: function() { return this.element; }
    })
  };


});

define(function(require) {
  'use strict';

  require('elements');

  var templateOut = document.getElementById('htemplate-out');

  templateOut.innerHTML = `
    <first-element></first-element>
  `;
  var first = templateOut.querySelector('first-element');
  first.render();
  var second = new SecondElement(templateOut);

  // Third element setup
  var third = document.createElement('div'),
      thirdRunId = 0;

  var thirdElementRender = require('htemplate')(function(html) {
    thirdRunId += 1;
    html`<h1 data-runid="${thirdRunId}">Third Element</h1>`;
  }, {
    element: function() { return third; }
  })
  thirdElementRender();
  templateOut.appendChild(third);

  describe('Alternate element targets for innerHTML', function() {
    it('First render OK', function() {

      assert.equal('1', first.shadowRoot.querySelector('h1').dataset.runid);
      assert.equal('1', second.element.querySelector('h1').dataset.runid);
      assert.equal('1', third.querySelector('h1').dataset.runid);
    });

    it('Second render OK', function() {
      first.render();
      second.render();
      thirdElementRender();

      assert.equal('2', first.shadowRoot.querySelector('h1').dataset.runid);
      assert.equal('2', second.element.querySelector('h1').dataset.runid);
      assert.equal('2', third.querySelector('h1').dataset.runid);
    });
  });
});
