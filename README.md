# Multiplayer snake in space

* #### [How to play](#how-to-play)
* #### [Tech used](#tech-used)
* #### [Installation](#installation)
* #### [License](#license)
* #### [Project history](#project-history)
* #### [Development](#development)
* #### [TODOs](#todos)

<br />

### How to play

Mostly there is an instance running [here](http://snake1.askefc.net), where you can just try out the game.

Enter a gamehandle/name and press Play or hit ENTER/RETURN.
Control the snake direction using arrow keys or WASD, while hitting SHIFT is for firing off your super speed powers.



<br />

### Tech used

A few open source projects is used to bring this project to life :

* [Node.js](https://nodejs.org) - Powering the backend server.
* [Express](https://expressjs.com) - Basically just for serving some dynamic content.
* [Twitter Bootstrap](https://getbootstrap.com) - Only the css part is used for styling what little html is present.
* [Socket.io](https://socket.io) - Used for websocket fast data streaming and server broadcasting.
* [Phaser-ce](https://github.com/photonstorm/phaser-ce) - The great game engine used for rendering and interaction.

And of course this project itself is open source with a [public repository](https://github.com/AskeFC/snake-multiplayer) on GitHub.

<br />

### Installation

[Node.js](https://nodejs.org/) is required.

Install the dependencies and start the server.

```sh
$ npm install
$ npm run start
```

<br />

### License
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

<br />

### Project history
The original work was made by @AntonUden who made it public on [GitHub](https://github.com) under [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT). Later it was, as you see here, sublicensed to [![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC).

>This version started as an offshoot on a cold day in the fall of 2020, the godforsaken year of the pandemic, where a considerable lot of workers where abruptly prevented from carrying out their work. A terrible accident, far beyond facepalming, had struck the state-owned [ISP](https://statens-it.dk/english) of [The Danish Agency for Data Supply and Efficiency](https://eng.sdfe.dk), where construction workers had inadvertently cut the one and only power cable providing their datacenter with electricity.
Now all was chaos and everyone scrambled, some to try and fix the problems at hand while others experimented with new and creative workarounds in an effort to continue their workday. Some of us instead accepted our ill-gotten fate and found solace in getting this game up and running on an offsite mini-server. Quickly our creative and ever-wondrous minds came up with tons of great ideas for improvements and changes, thus started this project...

<br />

### Development

Want to contribute? Great!

We would love ideas, contributions or whatever comes to mind.
Install, Hack away and share the goodness!

If you merely like to play the game but have some great feedback to share, just do it!

<br />

### Todos

 - [] Write help.
 - [] Rewrite so we can use Phaser 3.
 - [] Mobile support.
 - [] More awesome super powers.
 - [] Optimise.
 - [] Try other websocket implementations or something entirely different, just better performance.

<br />


# New Features!

  - Import a HTML file and watch it magically convert to Markdown
  - Drag and drop images (requires your Dropbox account be linked)


You can also:
  - Import and save files from GitHub, Dropbox, Google Drive and One Drive
  - Drag and drop markdown and HTML files into Dillinger
  - Export documents as Markdown, HTML and PDF

Markdown is a lightweight markup language based on the formatting conventions that people naturally use in email.  As [John Gruber] writes on the [Markdown site][df1]

> The overriding design goal for Markdown's
> formatting syntax is to make it as readable
> as possible. The idea is that a
> Markdown-formatted document should be
> publishable as-is, as plain text, without
> looking like it's been marked up with tags
> or formatting instructions.

This text you see here is *actually* written in Markdown! To get a feel for Markdown's syntax, type some text into the left window and watch the results in the right.

### Plugins

Dillinger is currently extended with the following plugins. Instructions on how to use them in your own application are linked below.

| Plugin | README |
| ------ | ------ |
| Dropbox | [plugins/dropbox/README.md][PlDb] |
| GitHub | [plugins/github/README.md][PlGh] |
| Google Drive | [plugins/googledrive/README.md][PlGd] |
| OneDrive | [plugins/onedrive/README.md][PlOd] |
| Medium | [plugins/medium/README.md][PlMe] |
| Google Analytics | [plugins/googleanalytics/README.md][PlGa] |

#### Building for source
For production release:
```sh
$ gulp build --prod
```
Generating pre-built zip archives for distribution:
```sh
$ gulp build dist --prod
```
### Docker
Dillinger is very easy to install and deploy in a Docker container.

By default, the Docker will expose port 8080, so change this within the Dockerfile if necessary. When ready, simply use the Dockerfile to build the image.

```sh
cd dillinger
docker build -t joemccann/dillinger:${package.json.version} .
```
This will create the dillinger image and pull in the necessary dependencies. Be sure to swap out `${package.json.version}` with the actual version of Dillinger.

Once done, run the Docker image and map the port to whatever you wish on your host. In this example, we simply map port 8000 of the host to port 8080 of the Docker (or whatever port was exposed in the Dockerfile):

```sh
docker run -d -p 8000:8080 --restart="always" <youruser>/dillinger:${package.json.version}
```

Verify the deployment by navigating to your server address in your preferred browser.

```sh
127.0.0.1:8000
```

#### Kubernetes + Google Cloud

See [KUBERNETES.md](https://github.com/joemccann/dillinger/blob/master/KUBERNETES.md)


License
----

MIT


**Free Software, Hell Yeah!**

[//]: # (These are reference links used in the body of this note and get stripped out when the markdown processor does its job. There is no need to format nicely because it shouldn't be seen. Thanks SO - http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax)


   [dill]: <https://github.com/joemccann/dillinger>
   [git-repo-url]: <https://github.com/joemccann/dillinger.git>
   [john gruber]: <http://daringfireball.net>
   [df1]: <http://daringfireball.net/projects/markdown/>
   [markdown-it]: <https://github.com/markdown-it/markdown-it>
   [Ace Editor]: <http://ace.ajax.org>
   [node.js]: <http://nodejs.org>
   [Twitter Bootstrap]: <http://twitter.github.com/bootstrap/>
   [jQuery]: <http://jquery.com>
   [@tjholowaychuk]: <http://twitter.com/tjholowaychuk>
   [express]: <http://expressjs.com>
   [AngularJS]: <http://angularjs.org>
   [Gulp]: <http://gulpjs.com>

   [PlDb]: <https://github.com/joemccann/dillinger/tree/master/plugins/dropbox/README.md>
   [PlGh]: <https://github.com/joemccann/dillinger/tree/master/plugins/github/README.md>
   [PlGd]: <https://github.com/joemccann/dillinger/tree/master/plugins/googledrive/README.md>
   [PlOd]: <https://github.com/joemccann/dillinger/tree/master/plugins/onedrive/README.md>
   [PlMe]: <https://github.com/joemccann/dillinger/tree/master/plugins/medium/README.md>
   [PlGa]: <https://github.com/RahulHP/dillinger/blob/master/plugins/googleanalytics/README.md>
