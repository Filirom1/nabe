(function() {
  var Article, EventEmitter, Mustache, Repo, Server, Site, config, express, fs, globalize, md, path, server, yaml;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  fs = require('fs');
  path = require('path');
  EventEmitter = require('events').EventEmitter;
  globalize = require('globalize');
  Mustache = require('mustache');
  express = require('express');
  md = require('github-flavored-markdown').parse;
  yaml = require('yaml');
  config = {
    author: 'Author',
    title: process.cwd().split('/').slice(-1)[0],
    root: 'index',
    url: 'http://localhost',
    port: 8080,
    ext: 'md',
    path: {
      public: path.join(__dirname, 'public'),
      articles: path.join(__dirname, 'articles'),
      templates: path.join(__dirname, 'templates')
    },
    date: function(date) {
      return globalize.format(date, 'f');
    },
    parse: function(str) {
      return globalize.parseDate(str, 'yyyy/MM/dd');
    },
    toHtml: function(str, data) {
      if (data == null) {
        data = {};
      }
      return Mustache.to_html(str, data);
    }
  };
  Server = (function() {
    Server.prototype.routes = {};
    function Server(config) {
      var app;
      this.config = config;
      app = this.server = express.createServer();
      app.use(express.logger()).use(app.router).use(express.directory(__dirname)).use(express.static(config.path.public)).use(express.errorHandler({
        dump: true,
        stack: true,
        message: true
      }));
      app.register('.' + config.ext, {
        compile: function(str, options) {
          var html;
          html = md(str);
          return function(locals) {
            return html.replace(/\{([^}]+)\}/g, function(_, name) {
              return locals[name];
            });
          };
        }
      });
      app.register('.html', {
        compile: function(str, options) {
          return function(locals) {
            return config.toHtml(str, locals);
          };
        }
      });
      app.set('views', this.config.path.templates);
      app.set('view engine', 'html');
      this.register(this.routes);
    }
    Server.prototype.register = function(routes) {
      var app, route, self, _results;
      app = this.server;
      self = this;
      _results = [];
      for (route in routes) {
        _results.push((function(route) {
          return app.get(route, function(req, res, next) {
            var action;
            action = self[routes[route]];
            if (!action) {
              return next('No action handler');
            }
            return action.apply(self, arguments);
          });
        })(route));
      }
      return _results;
    };
    Server.prototype.listen = function() {
      console.log("server started on " + this.config.port);
      return this.server.listen(this.config.port);
    };
    return Server;
  })();
  Site = (function() {
    __extends(Site, Server);
    function Site() {
      Site.__super__.constructor.apply(this, arguments);
    }
    Site.prototype.routes = {
      '/': 'index',
      '/article/:name': 'article'
    };
    Site.prototype.index = function(req, res, next) {
      return new Repo().articles().on('end', function(articles) {
        return res.render('index', {
          articles: articles
        });
      });
    };
    Site.prototype.article = function(req, res, next) {
      return new Article().load("" + req.params.name + "." + config.ext).on('error', function(e) {
        return next(e);
      }).on('data', function(article) {
        return res.render('article', article);
      });
    };
    return Site;
  })();
  Article = (function() {
    __extends(Article, EventEmitter);
    function Article() {
      Article.__super__.constructor.apply(this, arguments);
    }
    Article.prototype.load = function(file, callback) {
      fs.readFile(path.join(config.path.articles, file), __bind(function(err, content) {
        var data, html, meta, parts, val;
        if (err) {
          if (callback) {
            return callback(err);
          } else {
            return this.emit('error', err);
          }
        }
        content = content.toString();
        parts = content.split('\n\n');
        meta = parts[0] && !parts[0].match(/<(a-z)>/g) ? yaml.eval(parts[0]) : '';
        html = md(parts.slice(1).join('\n'));
        data = {
          title: meta.title || meta.Title || file,
          date: meta.date || meta.Date,
          file: file.replace(/\..+/, ''),
          content: content,
          summary: md(html.split('<h2>')[0]),
          html: html,
          meta: ((function() {
            var _results;
            _results = [];
            for (val in meta) {
              _results.push({
                key: val,
                value: meta[val]
              });
            }
            return _results;
          })()).filter(function(it) {
            return it.key !== 'title';
          }).map(function(it) {
            var isDate;
            isDate = /date/i.test(it.key);
            return {
              key: it.key,
              value: isDate ? config.date(config.parse(it.value)) : it.value
            };
          })
        };
        if (!callback) {
          return this.emit('data', data);
        }
        return callback(null, data);
      }, this));
      return this;
    };
    return Article;
  })();
  Repo = (function() {
    __extends(Repo, Article);
    function Repo() {
      Repo.__super__.constructor.call(this);
      this.on('error', function(err) {
        return console.error(err);
      });
    }
    Repo.prototype.articles = function() {
      var count, dir, results, sort;
      dir = config.path.articles;
      count = 1;
      results = [];
      sort = function(results) {
        return results.sort(function(a, b) {
          return Date.parse(b.date) - Date.parse(a.date);
        });
      };
      fs.readdir(dir, __bind(function(err, files) {
        if (err) {
          return this.emit('error', err);
        }
        return files.forEach(__bind(function(file) {
          var filePath;
          filePath = path.join(dir, file);
          return fs.stat(filePath, __bind(function(err, stat) {
            if (err) {
              return this.emit('error', err);
            }
            if (stat.isDirectory()) {
              this.emit('dir', file);
            }
            if (stat.isFile()) {
              return this.load(file, __bind(function(err, article) {
                if (err) {
                  return this.emit('error', err);
                }
                this.emit('file', results[results.push(article) - 1]);
                if (files.length === count++) {
                  return this.emit('end', sort(results));
                }
              }, this));
            } else {
              if (files.length === count++) {
                return this.emit('end', sort(results));
              }
            }
          }, this));
        }, this));
      }, this));
      return this;
    };
    return Repo;
  })();
  server = new Site(config);
  server.listen();
}).call(this);
