// vim:set sts=2 sw=2 tw=0 et:

module.exports = Server;

var http = require('http');
var Session = require('./session');
var Executor = require('./executor');

function Server()
{
  var config = {
    httpPort: 8080
  };

  function getSandbox(session)
  {
    // TODO:
    var executor = new Executor();
    return executor;
  }

  function getRawScript(session)
  {
    // TODO:
    return null;
  }

  function getEntryName(session)
  {
    // TODO:
    return 'foo';
  }

  function getArgObj(session)
  {
    // TODO:
    return [];
  }

  function handleRun(session)
  {
    var executor = getSandbox(session);
    var script = getRawScript(session);
    var assembly;
    var context;
    var entryName = getEntryName(session);
    var argObj = getArgObj(session);
    var result;

    try {
      assembly = executor.compile(script);
      context = assembly.context;
      context['_main'] = function () {
        console.log('entryName=%s argObj=%s',
            entryName, JSON.stringify(argObj));
      }
      result = executor.run('_main()', context);
    } catch (err) {
      session.writeHead(500, { 'Content-Type': 'application/json' });
      session.end(JSON.stringify({
        'error': err.stack ? err.stack : err,
      }));
    }
  }

  function handleCompile(session)
  {
    var executor = getSandbox(session);
    var script = getRawScript(session);
    var assembly;

    try {
      assembly = executor.compile(script);
      session.writeHead(200, { 'Content-Type': 'application/json' });
      session.end(JSON.stringify({
        'result': assembly.result,
      }));
    } catch (err) {
      session.writeHead(400, { 'Content-Type': 'application/json' });
      session.end(JSON.stringify({
        'error': err.stack ? err.stack : err,
      }));
    }
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
