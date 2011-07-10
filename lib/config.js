// This file allow you to configure this blog engine. 
//
// Configuration is determined in a two-step process. This file defines 
// defaults configuration property than can be extended/overridden by 
// `config.yml` files in their respective theme folder.

// ## Basic configuration 
var yaml = require('yaml'),
fs = require('fs'),
util = require('./utils/util'),
Path = require('path'),
yml = yaml.eval(fs.readFileSync(Path.join(process.cwd(), 'config.yml')).toString()),

defaults = {
  
  // ### hostAddress
  // control cross domain if you want. allow cross domain (for your subdomains)
  // disallow other domains. You'll certainly want to change this with yours.
  hostAddress: 'localhost|nodester.com|amazonaws',
  
  // ### port
  // server port, locally 5678 by default. built in specific port for cloudfoundry.
  port: process.env.VMC_APP_PORT || 5678,
  
  // ### articleDir
  // article dir path, you could set up whatever folder you like here `articles/any/sub/level/folder`
  articleDir: 'articles',
  
  // ### themeDir
  // same goes for the themes folder
  themeDir: 'themes',
  
  // ### theme
  // theme to be used, must match a valid directory in `themes`
  theme: 'default',
  
  // ### format
  // format property must match one of [the standard format](https://github.com/jquery/jquery-global#dates)
  format: 'F',

  // ### culture
  // any valid culture files in [globalize project](https://github.com/jquery/globalize/tree/master/lib/cultures).
  // The culture value specified here must mactch an existing file. `ex: globaliaze.culture.{culture}.js` 
  culture: 'ja',
  
  // ### summary
  // summary are generated following the `summary.delim` config (`<!--more-->` if you want)
  summary: {
    delim: '##'
  }
  
};


// exports our merged configuration.
// The order of precedence for conflicting settings is:
// * local configuration (config.yml)
// * defaults (this file)
module.exports = util.extend({}, defaults, yml);
