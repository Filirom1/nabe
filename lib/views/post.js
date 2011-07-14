var Path = require('path'),
Layout = require('./layout'),
config = require('../config');

module.exports = Layout.extend({
  template: Path.join(config.themeDir, config.theme, 'templates/article.html'),
  initialize: function initialize() {
    console.log('init post index:');
  }
});