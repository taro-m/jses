// vim:set sts=2 sw=2 tw=0 et:

module.exports = Server;

var http = require('http');
var Session = require('./session');

function Server()
{
  var config = {
    httpPort: 8080
  };

  this.config = config;
  this.httpServer = http.createServer(handleRequest);

  function handleRequest(req, res)
  {
    var session = new Session(req, res);
    session.run(function() { handleSession(session); });
  }

  function handleSession(session)
  {
    session.writeHead(200);
    session.end('Hello JSES');
  }
}

Server.prototype.start = function start()
{
  console.log('JSES HTTP Server listening at %d port', this.config.httpPort);
  this.httpServer.listen(this.config.httpPort);
}
