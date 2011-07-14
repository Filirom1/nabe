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

module.exports = Backnode.Collection.extend({
  path: config.articleDir,
  initialize: function() {
    // bind to the error event
    // will most likely happen on server startup, so throw exception if any
    this.bind('error', function(model, resp, options) {
      throw new Error(resp);
    });
  },
  
  parse: function(posts) {
    return _(posts).map(function(post) {
      var props = util.parseProps(post.content),
      summary = config.summary,
      delim = summary.delim ? new RegExp(summary.delim) : undefined;
      

      post = _.extend(props, post);
      
      // if post content does not have a delimiter within, summary are full article.
      sum = delim && delim.test(props.markdown) ? props.markdown.split(delim)[0] : props.markdown;
      post.markdown = util.markdown(sum);
      post.name = post.filename.replace(ext, '');
      return post;
    });
  },
  
  comparator: function(post) {
    // post are sorted in reverse chronological order
    return -(Date.parse(post.get('date')));
  },
  
  toJSON: function() {
    var json = Backnode.Collection.prototype.toJSON.apply(this, arguments);
    
    // Our views awaits something with title and an array of posts to iterate trough
    // so, serialize our collections and give them to views as {{posts}}
    return {
      title: 'Backbone on top of Connect for delicious applications',
      config: config,
      context: {config: config},
      articles: json
    };
  }
});

Backbone.sync = function(method, model, options) {
  var path;
  
  if(method !=="read") {
    return options.error('method is not read. not implemented yet.');
  }
  
  // Ensure that we have a Path.
  if (!options.path) {
    if (!(model && model.path)) return options.error('A model with a "path" property or function must be specified');
    options.path = _.isFunction(model.path) ? model.path() : model.path;
  }
  
  
  
  path = Path.join(process.cwd(), options.path);
  
  if(model.get('filename')) {
    
    return fs.readFile(path, function(err, content) {
      if(err) {
        return options.error(err.message);
      }
      
      options.success({
        id: options.path,
        filename: options.path,
        content: content.toString()
      });
    });
  }


  return fs.readdir(path, function(err, files) {
    if (err) {
      return options.error(err + ': ' + path);
    }
    
    var ret = [], ln;
    
    files = files.filter(function(file) {
      return ext.test(file) && /^[^_]/.test(file);
    });
    
    ln = files.length;
    
    _.each(files, function(file) {
      var name = file.replace(ext, '');
      
      fs.readFile(Path.join(path, file), function(err, content) {
        if(err) {
          return options.error(err.message);
        }
        
        ret.push({
          id: name,
          filename: file,
          content: content.toString()
        });
        
        if((ln--) === 1) {
          options.success(ret);
        }
      });
    });
  });

};
