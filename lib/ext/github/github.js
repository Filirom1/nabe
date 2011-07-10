var request = require('request'),
https = require('https'),
connect = require('connect'),
Path = require('path'),
ghm = require('github-flavored-markdown'),
jqtpl = require('jqtpl'),
util = require('../../utils/util');

// Expose module
exports = module.exports = function github(o, nabe) {
  console.log('init github layer > ', o.description);
  
  var projects = {},
  
  cache = {};
  
  o.github.projects.forEach(function(project) {
    var p = project.split(':')[0],
    file = project.split(':')[1];
    projects[p] = 'https://' + Path.join('raw.github.com', o.github.user, p, 'master', file);
  });
  
  util.addTemplate(Path.join(__dirname + '/github.gh.html'));
  
  return connect.router(function(app) {
    
    app.get('/:project', function(req, res, next) {
      var project = req.params.project,
      hasTmpl = jqtpl.template['tmpl.github.gh.html'],
      path = projects[project];
      
      if(!hasTmpl || !path) { return next(); }
      
      // if the content is already know, serve it directly
      if(cache[project]) { 
        req.data = cache[project];
        return exports.render(req, res, next); 
      }
      
      request({ uri: path}, function(err, response, body) {
        if(err || response.statusCode !== 200) {return next(err);}
        cache[project] = req.data = {
          body: body,
          path: path,
          project: project,
          config: util.extend({}, nabe, {
            title: project
          })
        };
        return exports.render(req, res, next);
      });
      
    });
    
  });
};

exports.render = function render(req, res, next) {
  var project = req.data.project,
  config = req.data.config,
  data = ghm.parse(req.data.body), 
  layout, partial;
  
  partial = util.toHtml('tmpl.github.gh.html', {config: config, content: data, name: project});
  layout = util.toHtml('tmpl.layout.html', {context: {content: data, config: config}, content: partial});

  // prettify snippets of code
  layout = util.prettify(layout);

  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Content-Length': layout.length
  });

  res.end(layout);
};