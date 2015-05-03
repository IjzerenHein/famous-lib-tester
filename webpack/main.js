define(function(require) {
    require('famous-polyfills');
    require('famous/core/famous.css');
    require('famous-flex/widgets/styles.css');
    require('../src/styles.css');
    require('./index.html');

    require('../src/app.js');
});
