var Path = require('path'),
fs = require('fs'),
Backnode = require('backnode'),
jqtpl = require('jqtpl'),
config = require('../config'),
Posts = require('../model/posts'),
Layout = require('./layout');


module.exports = Backnode.View.extend({
  template: Path.join(config.themeDir, config.theme, 'templates/layout.html'),
  placeholder: '{{html content}}',

   // ##### View constructor
   // is when the view instance gets its template file
   initialize: function(options) {
    console.log('init view layout:');
   },

   // ##### render method
   // the template file expects a collection to work properly
   // if model parameter is a Model instead, wraps it in a collection
   // to seamlessly use the same file for both index and post actions.
   render: function() {
     this.res.end(jqtpl.tmpl(this.template, this.model.toJSON()));
   }
});