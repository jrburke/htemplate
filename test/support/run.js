/* global assert:true */
'use strict';

var parts = location.href.split('?');
var url = parts[0];
var urlArgs = parts[1];
url = url.replace(/\/test\.html/, '');

var testId = url.split('/').pop();

document.querySelector('title').textContent = 'Test: ' + testId;

require.config({
  baseUrl: url,
  paths: {
    htemplate: '../../htemplate',
    chai: '../support/chai',
    co: '../support/co',
    element: '../support/element',
    evt: '../../lib/evt',
    mocha: '../../node_modules/mocha/mocha',
    transition_end: '../../lib/transition_end'
  },
  config: {
    element: {
      idToTag: function(id) {
        return id.toLowerCase().replace(/\//g, '-');
      }
    }
  }
});

if (urlArgs) {
  require.config({
    urlArgs: urlArgs
  });
}

var assert, co;
require(['chai', 'co', 'mocha'], function(chai, localCo) {
  co = localCo;
  mocha.setup('bdd');
  assert = chai.assert;
  require(['test'], function(test) {
    mocha.run(function(failures) {
      window.parent.postMessage({
        id: testId,
        failures: failures
      }, '*');
    });
  });
});
