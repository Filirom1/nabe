// **nabe** is a git-powered, minimalist blog engine for coders.
//
// ## Connect server 
//
// This file comes with a basic server configuration and is based on 
// [h5b-server-config for node](https://github.com/paulirish/html5-boilerplate-server-configs/blob/master/node.js)
var Path = require('path'),
fs = require('fs'),
connect = require('connect'),
Backnode = require('backnode'),
Router = require('./routes'),
util = require('./utils/util'),
config = require('./config');

// ### Create and expose the server
var nabe = module.exports = connect();

// ### Expose internal tools, helpers and additional layers
nabe.config = config;


// ## Main stack

// A logger with default config, bodyParser, and core router.
nabe
  .use(connect.logger())
  
  .use(connect.bodyParser())

  // **router module, more on this [here](routes.html)**
  .use(Backnode(new Router));
  
// ## Modules loading

// Any directory in lib/ext is itself an npm package which main entry must expose
// a valid connect layer. Modules are mounted on a route matching either a config 
// property in package.json (config.path) or the name of the module directory itself.

// Modules can expose assets too by putting them in module/public directory.

(function() {
  var path = Path.join(__dirname, 'ext/');
  
  // sync is ok there since we load once on startup
  fs.readdirSync(path).forEach(function (filename) {
    var modulePath = Path.join(path, filename),
    isDir = fs.statSync(modulePath).isDirectory(),
    stack = [], pkg, config, module, middleware;
    
    if (!isDir) {
      return;
    }
    
    // build up the stack
    try {
      module = require(modulePath);
      pkg = JSON.parse(fs.readFileSync(Path.join(modulePath, 'package.json')), 'utf8');
      config = pkg.config;
      config.description = pkg.description;
      
      // init the middleware
      middleware = module.call(module, config, nabe.config);
      
      // build up the stack, eventually with any before/after layer
      stack = module.before ? stack.concat(module.before) : stack;
      stack = stack.concat(middleware);
      stack = module.after ? stack.concat(module.after) : stack;
    } catch(e) {
      console.error('Cannot get module -> ', filename, '. Error: ', e.message);
    }
    
    // register our new stack to connect, mounted on `config.path`
    nabe.use.apply(nabe, [].concat(
      config && config.path ? config.path : filename,
      stack,
      connect.static(Path.join(modulePath, 'public'))
    ));
  });
  
})();


nabe
  // set to the `public` folder in themes.
  .use(connect.static(Path.join(process.cwd(), nabe.config.themeDir, nabe.config.theme, 'public'), {

    // set your cache maximum age, in milliseconds.
    // if you don't use cache break use a smaller value

    // maxAge is set to one month
    maxAge: 1000 * 60 * 60 * 24 * 30
  }))
  
  // also add articles folder as static dir for conveniency in serving img
  // plus may be usefull to get raw access to markdown format
  .use(connect.static(nabe.config.articleDir.replace(/\/$/, '')));
  

// ### Error handling
// 404 - if no routes matching, returns 404 page
nabe
  .use(function(req, res, next){
    next(new Error('404 Not found'));
  })
  .use(connect.errorHandler({
    stack: true,
    message: true,
    dump: false
  }));


// this is a failsafe, it will catch the error silently and logged it the console.
// While this works, you should really try to catch the errors with a try/catch block
// more on this [here](http://nodejs.org/docs/v0.4.7/api/process.html#event_uncaughtException_)
process.on('uncaughtException', function (err) {
   console.log('Caught exception: ' + err.stack);
});
