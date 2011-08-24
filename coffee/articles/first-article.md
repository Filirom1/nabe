Date: '2011/08/24'

A whole new blog
================

Thanks to [mklabs](https://github.com/mklabs) I've just started a new blog with a
nodeJs HTML5 powered, coffee-scripted, git backed, markdownized blog engine : 
[see the internals it rocks ;)](https://github.com/mklabs/nabe/tree/coffee)


This blog is hosted on Heroku. If you want to do the same stuff, [follow the 
white rabbit](http://devcenter.heroku.com/articles/node-js).


If you hate english, I will continue to post in french on [my old blog](http://geek-du-soir.blogspot.com/)


And just to prove that CoffeeScript is beautiful, I give you a snippet of code : 


    class Personn
      constructor: ->
        @name = "Romain"
      
      sayHello: ->
        "Hello #{@name}"
    
    p = new Personn()
    console.log p.sayHello()