# htemplate

Creates a
[tagged template string function](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/template_strings#Tagged_template_strings)
that is aware of HTML in the generated strings.

Its primary purpose is generating the interior contents of a DOM-related component model. That component model could be custom elements, or your own type of component model that uses DOM nodes with special classes or attributes to indicate the component type.

## Prerequisites

Assumes a browser that supports:

* [ES2015 Tagged template strings](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/template_strings#Tagged_template_strings)

It is implemented as a UMD module that can be used as an AMD or Node-style CommonJS module, or in a non-module, browser globals setup via the `htemplate` global.

## Install

Grab the htemplate.js in this repo and place it in your project. You can get the
latest release via the
[`latest` tag](https://raw.githubusercontent.com/jrburke/htemplate/latest/htemplate.js).

The module does not have any dependencies.

These also work:

```
npm install jrburke/htemplate
bower install jrburke/template
volo install jrburke/htemplate
```

### API Introduction.

The main entry point is the htemplate() function returned as the module export.
htemplate() returns a function that when called later will do the following:

* Runs the renderFn function that uses the `html()` tagged template.
* Sets `this.innerHTML` with the text result.
* Calls/sets properties on sub-elements in that innerHTML that should receive non-string objects.

See the full API section for more details. Here is a an example of its use for creating a custom element that does not use Shadow DOM or any model binding, just sets the innerHTML when the createdCallback, a custom element lifecycle method, is called by the browser.

```javascript
var htemplate = require('htemplate');

var accounts = [
  {
    id: 1,
    name: 'Alice'
  },
  {
    id: 2,
    name: 'Bob'
  }
];

var proto = Object.create(HTMLElement.prototype);
proto.createdCallback = require('htemplate')(function(html) {
  // Use the html() function created by htemplate to build up the HTML. No need
  // to assign the result of html() to a variable, htemplate will collect the
  // calls to html() and combine them all after this function finishes.
  html`
  <h1>Accounts</h1>
  <ul>
  `

  accounts.forEach(function(account) {
    html`<li><a href="accounts/${account.id}">${account.name}</a></li>`;
  });

  html`
  </ul>
  `
});

// Register the custom element.
document.registerElement('my-element', {
  prototype: proto
});

// To use this component:
var element = document.createElement('my-element');
```

Since `this` is used inside the function returned by htemplate(), it is tailored to be used in custom elements, where `this.innerHTML` maps to the interior HTML contents of the custom element.

If you are using a component system where that does not work: maybe the DOM for the element lives on a property called `this.dom`. In that case, use the `element` option to return `this.dom`. The `element` option can be a DOM element or a function that is called with the `this` set to the `this` when the renderFn is called:

```javascript
this.render = require('htemplate')(function(html) {
  html``;
}, {
  element: function() { return this.dom; }
});
```

If you want to use the Shadow DOM instead of setting the public innerHTML for a custom element:

```javascript
this.render = require('htemplate')(function(html) {
  html``;
}, {
  element: function() { return this.createShadowRoot(); }
});
```

If you just wanted to create a function that is not part of a custom component, but renders the innerHTML of the document body:

```javascript
var render = require('htemplate')(function(html) {
  html``;
}, {
  element: document.body
});

// Call render() any time you want the document.body to be generated.
render();
```

htemplate does not do any virtual DOM diffing, it will just set the innerHTML. Create small components that have fine grained model listening that just update the parts of the UI that change.

## API

```javascript
var WHAT = htemplate(renderFn, options);
```

### renderFn

`renderFn` is the function that will be called

### options

### Property setting

xxx

## Tests

Run `npm install` first to install mocha for the tests.

To run the tests, open `test/all.html` in a browser and press the "Go" button.
Each test is also individually loadable in a browser for easy per-test
debugging.

Browser prerequisites for tests:

* Run in a browser that supports
[custom elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Custom_Elements).
Just `document.registerElement` is needed.
* Tagged template strings.

Firefox with the `dom.webcomponents.enabled` pref set to true (via about:config) or Chrome work well.

### Tests todo

* plain element, this.dom, shadow DOM.

## License

[Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0)

## History

Extracted from a mozilla-b2g/gaia email app branch that started in 2015.
