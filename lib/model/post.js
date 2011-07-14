//  Provides needed interface to read blog posts from the git repo

var fs = require('fs'),
Path = require('path'),
Backnode = require('backnode'),
Backbone = Backnode.Backbone,
_ = Backnode._,
eyes = require('eyes'),
config = require('../config'),
util = require('../utils/util');

var ext = /\.md$|\.mkd$|\.markdown$/;

module.exports = Backnode.Model.extend({
  
  initialize: function() {
    // bind to the error event
    // will most likely happen on server startup, so throw exception if any
    this.bind('error', function(model, resp, options) {
      throw new Error(resp);
    });
  },
  
  
  path: function() {
    return Path.join(config.articleDir, this.get('filename') + '.markdown');
  },
  
  parse: function(post) {
    var props = util.parseProps(post.content);
    return _.extend(post, props, {
      markdown: util.markdown(util.extractProps(post.content)),
      name: post.filename.replace(ext, '').replace(config.articleDir + '/', '')
    });
  },
  
  toJSON: function() {
    var json = Backnode.Model.prototype.toJSON.apply(this, arguments);
  
    // Our views awaits something with title and an array of posts to iterate trough
    // so, serialize our collections and give them to views as {{posts}}
    return {
      title: 'Backbone on top of Connect for delicious applications',
      config: config,
      context: {config: config},
      article: json,
      content: json.markdown
    };
  }
});