var Path = require('path'),
Layout = require('./layout'),
config = require('../config');

module.exports = Layout.extend({
  template: Path.join(config.themeDir, config.theme, 'templates/index.html'),
  initialize: function initialize() {
    console.log('init view index:');
  }
});
