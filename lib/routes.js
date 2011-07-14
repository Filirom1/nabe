// ## Router

var Path = require('path'),
Backnode = require('backnode'),
config = require('./config'),
Posts = require('./model/posts'),
Post = require('./model/post'),
IndexView = require('./views/index'),
PostView = require('./views/post');

// ## Router - handle incoming request
module.exports = Backnode.Router.extend({
  routes: {
    '':                     'index',    
    'article/:article':     'article'
  },
  
  // ##### Route constructor
  // Creates and attach model Collections and Views.
  initialize: function() {
    this.posts = new Posts();
    this.post = new Post();
    
    // create a view tied to our posts collection
    this.indexView = new IndexView({model: this.posts});
    
    // create a view tied to our post model
    this.postView = new PostView({model: this.post});
  },
  
  index: function() {
    var abspath = Path.join(config.articleDir).replace(/\/$/, ''),
    self = this;
    
    this.posts.fetch({
      success: function fetchSuccess(model, posts) {
        self.indexView.render();
      }
    });

    return this;
  },
  
  article: function(article) {
    var self = this;
    
    this.post.set({
      filename: article
    });
    
    this.post.fetch({
      success: function fetchSuccess(model, posts) {
        self.postView.render();
      }
    });
    
    return this;
  }
});