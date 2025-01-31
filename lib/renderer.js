// This file is the main application controller; it is loaded and used by the [router](routes.html) module. 
//
// Generally, this file should be used only for defining actions and methods
// should follow the `.method(req, res, next)` pattern. Alternately, 
// each method also accept a fourth optional parameter `.method(req, res, next cb)`
// where cb is a callback used internally if defined to override default render behaviour.
var fs = require('fs'),
Path = require('path'),
sys = require('sys'),
events = require('events'),
config = require('./config'),
findgit = require('./utils/findgit'),
util = require('./utils/util'),
Posts = require('./model/posts');

// ## Renderer
// Main actions(controllers) go here. renderers are instance of 
// EventEmitter to provide a set of response lifecycle hooks.
var Renderer = function Renderer(o) {
  var dir, pages = [];
  
  events.EventEmitter.call(this);
  
  // attach configuration as options instance property for conveniency
  this.options = config;

  dir = Path.join(this.options.themeDir, this.options.theme);
    
  // add each templates found in `themeDir/theme/templates`
  findgit.find(Path.join(dir, 'templates'))
    .on('file', function (file, stat) {
      if( !(/\.html|\.xml/.test(file)) ) {
        return;
      }
        
      pages.push(file);
    })
    .on('end', function end() {
      pages.forEach(function(page) {
        util.addTemplate(page);
      });
    });
  
  // init Posts model with mixin options
  this.posts = new Posts(this.options);
};

// inherits from [`events.EventEmitter`](http://nodejs.org/docs/v0.4.7/api/events.html)
sys.inherits(Renderer, events.EventEmitter);

// ### .index(req, res, next, cb)
// main action, called on `/`, display a list of articles sorted by most recent one
Renderer.prototype.index = function index(req, res, next, cb) {
  var abspath = Path.join(this.options.articleDir).replace(/\/$/, ''),
  self = this;

  this.posts.all(abspath, cb || function(err, results) {
    if(err) { return next(err); }
    self.render('index.html', req, res, {
      articles: results
    });        
  });
  
  return this;
};

// ### .category(req, res, next, cb)
// category action, called on `category/folder/or/subfolder`
// display a list of articles sorted by most recent one, and filtered by corresponding path
Renderer.prototype.category = function category(req, res, next, cb) {
  var abspath = this.options.articleDir.replace(/\/$/, ''),
  filter = req.params.category || req.params,
  r = new RegExp('/' + filter + (/\/$/.test(filter) ? '' : '/')),
  self = this;
  
  this.posts.categories(abspath, r, cb || function(err, results) {
    if(err) { return next(err); }
    self.render('index.html', req, res, {articles: results});
  });
  
  return this;
};

// ### .tag(req, res, next)
// tag action, called on `tag/tag-name`
// display a list of articles sorted by most recent one, and filtered by corresponding tag
Renderer.prototype.tag = function tag(req, res, next, cb) {
  var abspath = this.options.articleDir.replace(/\/$/, ''),
  filter = new RegExp('/' + req.params.category + '/'),
  self = this;
  
  this.posts.tags(abspath, req.params.tag, cb || function(err, results) {
    if(err) { return next(err); }
    self.render('index.html', req, res, {articles: results});
  });
  
  return this;
};

// ### .article(req, res, next)
// article action, called on `/article/article-name` or `/article/folder/or/subfolder/article-name`
// display an article content along metadata informations and git revisions.
Renderer.prototype.article = function(req, res, next, cb) {
  var article = req.params[0],
  abspath = Path.join(this.options.articleDir, article).replace(/\/$/, ''),
  mkdpath = abspath + '.markdown',
  self = this;
  
  this.posts.find(abspath + '.markdown', cb || function(err, results){
    if(err) { return next(err); }
    self.render('article.html', req, res, {
      article: results,
      author:  {name: results.author},
      content: results.body
    });
  });
  
  return this;
};

// ### .revision(req, res, next)
// revision action, called on `e3e43764c7854f5ce4c16d527ec6244a3c2a0f7d/article-name`
// display content of article-name.markdown from git history
Renderer.prototype.revision = function(req, res, next, cb) {
  var sha = req.params[0],
  file = req.params[1],
  self = this;
  
  this.posts.revision(sha, file, cb || function(err, results) {
    if(err) { return next(err); }

    self.render('article.html', req, res, {
      article: results,
      author:  {name: results.author},
      content: results.body
    });
  });
};

//### .search(req, res, next, cb)
// search action, called on `/search/:where`.
// Either expects a `q` post parameter (req.body.q exists), or `year`/`month` params as 
// named params (req.params.year && req.params.month). The part after `/search/` is the
// `where` filter. It's used internally by the `git grep` command to narrow the search to 
// a specific directory. As usually, the last optional `cb` parameter is there to provide
// another logic to render results from post layer.
Renderer.prototype.search = function(req, res, next, cb) {
  var where = req.params[0],
  year = req.params.year,
  month = req.params.month, 
  prefix = !req.body ? 'Archives' : 'Search',
  term = '',
  self = this;
  
  where = where || this.options.articleDir + '/';
  
  if(!req.body) {
    term += month ? util.toLocaleMonth(month): '[a-z]{3}';
    term += ' [0-9]{2} ';
    term += year ? year : '';
  }
  
  term = req.body ? req.body.q : term;

  this.posts.search(term, where, cb || function(err, results) {
    if(err) { return next(err); }
    self.render('search.html', req, res, {
      articles: results, 
      term: prefix + ' for ' + term.replace(/\[.+\]|\{.+\}/g, '')
    });
  });
  
  return this;
};

//### .archives(req, res, next)
// archives action, called on `/archives`
// same as index but rendered using arhcives.html template
Renderer.prototype.archives = function(req, res, next, cb){
  var abspath = this.options.articleDir.replace(/\/$/, ''),
  self = this;

  this.posts.all(abspath, cb || function(err, results) {
    var years = [];
    if(err) { return next(err); }
    
    results.forEach(function(file) {
      var y = file.date.match(/[\d]{4}/),
      year = y && y[0] ? y[0] : '';
      
      if(year && years.indexOf(year) === -1) {
        years.push(year);
      }
    });
    
    self.render('archives.html', req, res, {articles: results, years: years});
  });
  
  return this;
};

//### .feed(req, res, next)
// feed action, called on `feed.xml`
// same as index but rendered using feed.xml template to provide a simple and basic rss feed
Renderer.prototype.feed = function(req, res, next, cb){
  var abspath = this.options.articleDir.replace(/\/$/, ''),
  format = this.options.format,
  culture = this.options.culture,
  feedstart = this.options.feedstart,
  self = this;

  this.posts.all(abspath, cb || function(err, results) {
    if(err) { return next(err); }
    
    results = results.filter(function(article) {
      var date = util.toDate(article.date, format, culture),
      start = new Date(feedstart);
      
      return (Date.parse(date) - Date.parse(start)) > 0;
    });
    
    self.render('feed.xml', req, res, {articles: results}, true);
  });
  
  return this;
};

//### .render(target, res, data, force = false)
// convenience method. response is automatically 'sidebarized', meaning that data passed in
// will have a special sidebar/has_sidebar properties available to use 
// (if a matching _sidebar.markdown is found).
Renderer.prototype.render = util.sidebarize(function render(target, req, res, data, force) {
  var partial, layout, buffer;
  
  // set up config hash in data passed in
  data.config = this.options;
  
  // this is where we fire the single response hook, right before templating and response end.
  this.emit('nabe.render', req, res, data);
  
  // if any listener have ended the response, prevent default behaviour.
  if(res.finished) {return;}
  
  // force argument when set to true prevent template from being decorated with `layout.html`
  // (useful in the case of `feed.xml`)
  partial = util.toHtml('tmpl.' + target, data);
  layout = !force ? util.toHtml('tmpl.layout.html', {context: data, content: partial}) : partial;
  
  // prettify snippets of code
  layout = util.prettify(layout);
  
  // with feeds, the ' escape made it non valid feed.
  layout = layout.replace(/&#39/g, "'");
  
  buffer = new Buffer(Buffer.byteLength(layout));
  buffer.write(layout, 'utf8');
  
  res.writeHead(200, {
    'Content-Type': /\.xml/.test(target) ? 'application/rss+xml' : 'text/html',
    'Content-Length': buffer.length
  });
  
  res.end(buffer);
});

// expose the Renderer Object via
module.exports = new Renderer(config);