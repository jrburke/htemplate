# htemplate

Creates a
[tagged template string function](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/template_strings#Tagged_template_strings)
that is aware of HTML in the generated strings.

Its primary purpose is generating the interior contents of a DOM-related component model. That component model could be custom elements, or your own type of component model that uses DOM nodes with special classes or attributes to indicate the component type.

## Prerequisites

Assumes a browser that supports:

* [ES2015 Tagged template strings](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/template_strings#Tagged_template_strings)

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

### API Introduction

It is implemented as a UMD module that can be used as an AMD or Node-style CommonJS module, or in a non-module, browser globals setup via the `htemplate` global.

The main entry point is the htemplate() function returned as the module export. htemplate() returns a function that when called later will do the following:

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

htemplate does not do any virtual DOM diffing, it will just set the innerHTML. Create small components that have fine grained model listening to minimize the parts of the UI that change.

## API

```javascript
this.render = htemplate(renderFn, options);
```

### renderFn

`renderFn` is the function that will be called with the `html()` tagged template function. `renderFn` will use it to build up a string of HTML to insert as the innerHTML for an element. In its default configuration it assumes the element is a custom element. The `html()` function will properly HTML escape strings for expression interpolations.

For example:

```javascript
// When this.render() is called, the innerHTML generated would be:
// <p>Go this way: &lt;north&gt;</p>

this.render = htemplate(function(html) {
  var direction = '<north>';
  html`<p>Go this way: ${direction}</p>`;
});
```

### options

#### element

Function or DOM element. Optional. This controls what element is used for the `element.innerHTML` call done internally. By default, the element is the same `this` used for the renderFn, but see the [API Introduction](#api-introduction) section for ways to target using a Shadow DOM, some other component property, or just a plain element already in the DOM.

The value can be a function, or a DOM element. The function is called with `this` as the same as the `this` used for the renderFn.

#### verifyFn

Function. Optional. Once the HTML string has been constructed from the renderFn but before it is used for the innerHTML call, the verifyFn can verify or change the text result.

This is useful for tasks like confirming all the custom elements used in the HTML string have already been loaded. This logic could be unique the loading situation of the app.

The function is called with the `this` value the same as the `this` used for renderFn, and one parameter is passed to the function, `tagResult`, which has the following properties:

* text: the HTML string generated from renderFn.
* propId: A unique ID used to bind the props property sets later, if property sets were used in the template. Only useful if manually calling `htemplate.applyProps()`. Part of the [property setting](#property-setting) functionality, can be ignored for the usual `htemplate()` usage.
* props: An object that holds the property sets to do. Only useful if manually calling `htemplate.applyProps()`. Part of the [property setting](#property-setting) functionality, can be ignored for the usual `htemplate()` usage.

#### toStringAll

Boolean. Optional. If set to true, this will force all non-string values that are a result of expression interpolation to just be toString()'d into the resulting HTML string, instead of treating them as [property sets](#property-setting) on elements in the HTML.

In summary, it turns off the [property setting](#property-setting) capability.

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
