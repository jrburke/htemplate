# htemplate

Creates a
[tagged template string function](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/template_strings#Tagged_template_strings)
that is aware of HTML in the generated strings.

Its primary purpose is generating the interior contents of a DOM-related
component model. That component model could be custom elements, or your own type
of component model that uses DOM nodes with special classes or attributes to
indicate the component type.

## Prerequisites

Assumes a browser that provides:

* [Tagged template strings](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/template_strings#Tagged_template_strings)

It is implemented as a UMD module that can be run in an AMD or node environment.

## Install

Grab the htemplate.js in this repo and place it in your project. These also work:

```
npm install jrburke/htemplate
```

or

```
volo install jrburke/htemplate
```

### API

## Tests

Run `npm install` first to install dev dependencies.

To run the tests, open `test/all.html` in a browser and press the "Go" button.
Each test is also individually loadable in a browser for easy per-test
debugging.

Test prerequisites:

* Run in a browser that supports
[custom elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Custom_Elements).
Just `document.registerElement` is needed.

## License

[Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0)

## todo

Tests:
* Test sub-functions.
* Test option.
* Test object that has a toString
* Test two different instances of same custom element, should get different binding IDs, so they can be nested.
* If data-x attribute, then do not do prop work, toString always.
