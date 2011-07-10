
var http = require('http'),
renderer = require('../../renderer'),
mime = require('mime'),
eyes = require('eyes').inspector({stream: null});


exports = module.exports = function contentNegotiation(options) {
  options = options || {};
  
  console.log('init content negotiation layer > ', options.description);
  
  
  // the renderer is an instance of events.EventEmitter
  // that any module can require and provide/subscribe to custom events
  renderer.on('nabe.render', function(req, res, data){
    var a = req.headers ? req.headers.accept : 'text/html';
  
    for (var key in exports) {
      if (~a.indexOf(key)) {
        return exports[key](res, data);
      }
    }
    
  });
  
  return function json(req, res, next) {
    // trigger on each routes not handled by the main blog layer
    
    // may some day do something usefull here, or not...
    
    // maybe a custom 404 json response  
    next();
  };
};

/**
 * Respond with text/html.
 *
 * This is a noop. Pass control over following middlewares.
 */

exports.html = function(res, data){};

/**
 * Respond with application/json.
 */

exports.json = function(res, data){
  data = JSON.stringify(data);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', data.length);
  res.end(data);
};

/**
 * Respond with text/plain.
 */

exports.plain = function(res, data){
  data = eyes(data);
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', data.length);
  res.end(data);
};