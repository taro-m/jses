// vim:set sts=2 sw=2 tw=0 et:

module.exports = Server;

var http = require('http');
var Session = require('./session');
var Executor = require('./executor');
var StreamUtil = require('./stream_util');

function Server()
{
  var config = {
    httpPort: 8080
  };

  // TODO: implement sandbox API.
  var baseContext = {
    _entryPoints_: {},
    regsiterEntryPoint: function(name, func) {
      _entryPoints_[name] = func;
    },
  };

  function getSandbox(session)
  {
    var executor = new Executor(baseContext);
    return executor;
  }

  function fetchScript(session, url, callback)
  {
    // TODO:
    throw new Error('Not implemented yet');
  }

  function parseRequest(session, callback)
  {
    function parseBody(body)
    {
      var parsed = JSON.parse(body);
      if ('script' in parsed) {
        callback({
          script: parsed.script,
          entryName: parsed.entryName,
          argObj: parsed.argObj,
        });
      } else if ('scriptUrl' in parsed) {
        fetchScript(session, parsed.scriptUrl, function(script) {
          callback({
            script: script,
            entryName: parsed.entryName,
            argObj: parsed.argObj,
          });
        });
      }
    }

    StreamUtil.readAll(session.request, parseBody);
  }

  function handleRun(session)
  {
    function run(parsed)
    {
      var executor = getSandbox(session);
      var script = parsed.script;
      var entryName = parsed.entryName;
      var argObj = parsed.argObj;
      var assembly;
      var context;
      var result;
      var stepCount = 0;

      try {
        assembly = executor.compile(script);
        context = assembly.context;
        context['_main_'] = function () {
          console.log('entryName=%s argObj=%s',
              entryName, JSON.stringify(argObj));
          // invoke an entry point function.
          _entryPoints_[entryName](argObj);
        }
        context['_step_'] = function() {
          ++stepCount;
          // FIXME: throw an error when detect over steps.
        }
        result = executor.run('_main_()', context);
      } catch (err) {
        session.writeHead(500, { 'Content-Type': 'application/json' });
        session.end(JSON.stringify({
          'error': err.stack ? err.stack : err,
        }));
      }
    }

    parseRequest(session, run);
  }

  function handleCompile(session)
  {
    function compile(parseBody) {
      var executor = getSandbox(session);
      var script = parsed.script;
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

    parseRequest(session, compile);
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
