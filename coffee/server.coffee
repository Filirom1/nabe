
# **CoffeeScript Quick and dirty blog engine**
#
# > Go, Go Coffee!
#
# This is a minimalist blog engine. The whole weighs under 200 sloc and is a great way to try to learn this cool stuff.

# ### module dependencies

fs = require('fs')
path = require('path')
EventEmitter = require('events').EventEmitter
globalize = require('globalize')
Mustache = require('mustache')
express = require('express')
md = require('github-flavored-markdown').parse
yaml = require('yaml')

# ### config hash object
# * author
# * site title
# * page to render on `/`
# * site url
# * server port
# * template dir
# * articles markdown allowed extensions
# * date helper, default is using globalize.
# **template helper**, default is using a custom and really basic template engine.
# *ex*: using mustache  `Mustache.to_html(str, data)`
config = 
  author: 'Author'
  title: process.cwd().split('/')[-1..][0]
  root: 'index'
  url: 'http://localhost'
  port: process.env.PORT || 8080
  ext: 'md',
  path: 
    public: path.join __dirname, 'public'
    articles: path.join __dirname, 'articles'
    templates: path.join __dirname, 'templates'
  date: (date) -> 
    globalize.format date, 'f'
  parse: (str) ->
    globalize.parseDate str, 'yyyy/MM/dd'
  toHtml: (str, data = {}) -> 
    Mustache.to_html(str, data)
  
# ### Server class
class Server
  routes: {}
  
  constructor: (@config) ->
    app = @server = express.createServer()
    
    app
      .use(do express.logger)
      .use(app.router)
      .use(express.directory __dirname)
      .use(express.static config.path.public)
      .use(express.errorHandler {dump: true, stack: true, message: true})
      
    app.register '.' + config.ext, {
      compile: (str, options) ->
        html = md(str)
        (locals) ->
          html.replace /\{([^}]+)\}/g, (_, name) -> 
            locals[name]
    }
    
    app.register ".mustache", require('stache')
    app.set 'views', @config.path.templates
    app.set 'view engine', 'mustache'
    
    @register @routes
      
  register: (routes) ->
    app = @server
    self = @
    
    for route of routes
      do (route) ->
        app.get route, (req, res, next) ->
          action = self[routes[route]]
          return next 'No action handler' unless action
          action.apply self, arguments
          
  listen: () ->
    console.log "server started on #{@config.port}"
    @server.listen @config.port
    
# ### Site class
class Site extends Server
  routes: {
    '/': 'index',
    '/article/:name': 'article',
    '/feed.xml': 'feed'
  }
  
  index: (req, res, next) -> 
    new Repo().articles()
      .on 'end', (articles) -> 
        res.render 'index',
          articles: articles
  
  feed: (req, res, next) -> 
    new Repo().articles()
      .on 'end', (articles) -> 
        res.contentType 'text/xml'
        res.render 'feed',
          articles: articles,
          layout: false
  
  article: (req, res, next) -> 
    new Article()
      .load "#{req.params.name}.#{config.ext}"
      .on 'error', (e) -> next(e)
      .on 'data', (article) ->
        res.render 'article', article
     

# ### Article class
# articles are EventEmitter instances. They expose a single
# load method with takes a file path to search for, and a callback optionnaly.
#
# If the callback is ommited, the EventEmitter style is assumed with article's data
# emitted via `@emit 'data', {title, date, file, content, summary, html, meta}`
#
# If a callback is provided, it gets called with rather than emitting data. Signature is following
# node conventions where the first argument is always an error object or null.
class Article extends EventEmitter
  load: (file, callback) ->
    fs.readFile path.join(config.path.articles, file), (err, content) =>
      return (if callback then callback err else @emit 'error', err) if err
      
      content = content.toString()
      parts = content.split('\n\n')
      meta = if parts[0] and !parts[0].match(/<(a-z)>/g) then yaml.eval(parts[0]) else ''
      html = md parts[1..].join('\n')
      
      data = { 
        title: meta.title or meta.Title or file.replace(/\..*/g, '').replace(/-/g, ' ').replace(/\b[a-z]/g, (word) -> word.toUpperCase())
        date : meta.date or meta.Date
        file: file.replace(/\..+/, '')
        content: content
        summary: md html.split('<h2>')[0]
        html: html
        meta: ({key: val, value: meta[val]} for val of meta)
          .filter((it) -> return it.key isnt 'title')
          .map((it) -> 
            isDate = /date/i.test(it.key)
            {key: it.key, value: if isDate then config.date(config.parse(it.value)) else it.value}
          )
      }
      
      
      return @emit 'data', data unless callback
      callback null, data
    @

# ### Repo class
# Repo inherits from Article (and as such, from EventEmitter) and provide an additionnal
# articles method, used to build the articles list, sorted in reverse chronologival order
class Repo extends Article
  constructor: ->
    super()
    @on 'error', (err) -> console.error err
    
  articles: ->
    dir = config.path.articles
    count = 1
    results = []
    
    sort = (results) -> 
      results.sort (a, b) ->
        Date.parse(b.date) - Date.parse(a.date)
    
    fs.readdir dir, (err, files) =>
      return @emit 'error', err if err
      
      files.forEach (file) =>
        filePath = path.join dir, file
        
        fs.stat filePath, (err, stat) => 
          return @emit 'error', err if err
          @emit 'dir', file if stat.isDirectory()
          
          if stat.isFile()
            @load file, (err, article) =>
              return @emit 'error', err if err
              @emit 'file', results[results.push(article) - 1]
              @emit 'end', sort(results) if files.length is count++
          else 
            @emit 'end', sort(results) if files.length is count++
    @ 

# #### Lauch the whole stuff
server = new Site config
do server.listen
