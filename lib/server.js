// vim:set sts=2 sw=2 tw=0 et:

module.exports = Server;

var http = require('http');
var Session = require('./session');

function Server()
{
  var config = {
    httpPort: 8080
  };

  function handleRun(session)
  {
    // TODO:
    session.writeHead(200);
    session.end('Hello JSES/run');
  }

  function handleCompile(session)
  {
    // TODO:
    session.writeHead(200);
    session.end('Hello JSES/compile');
  }

  function handleSession(session)
  {
    switch (session.url.pathname) {
      case '/run':
      case '/run/':
        handleRun(session);
        break;

      case '/compile':
      case '/compile/':
        handleCompile(session);
        break;

      default:
        session.writeHead(404);
        session.end('Unknown resource: ' + session.url.pathname);
        break;
    }
  }

  function handleRequest(req, res)
  {
    var session = new Session(req, res);
    session.run(function() { handleSession(session); });
  }

  this.config = config;
  this.httpServer = http.createServer(handleRequest);
}

Server.prototype.start = function start()
{
  console.log('JSES HTTP Server listening at %d port', this.config.httpPort);
  this.httpServer.listen(this.config.httpPort);
}
