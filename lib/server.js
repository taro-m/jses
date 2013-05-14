// vim:set sts=2 sw=2 tw=0 et:

module.exports = Server;

var http = require('http');
var url = require('url');
var util = require('util');
var Session = require('./session');
var Executor = require('./executor');
var StreamUtil = require('./stream_util');

function Server()
{
  var config = {
    httpPort: 8080
  };

  // TODO: implement sandbox API.
  var entryPoints = {}
  var baseContext = {
    _entryPoints_: entryPoints,
    register: function(name, func) {
      entryPoints[name] = func;
    },
    log: function() {
      console.log.apply(null, arguments);
    }
  };

  function getSandbox(session)
  {
    var executor = new Executor(baseContext);
    return executor;
  }

  function fetchScript(session, urlStr, callback)
  {
    var req;

    function onFetch(body)
    {
      callback(body);
    }

    function onRespond(res)
    {
      session.domain.add(res);
      if (res.statusCode != 200) {
        throw new Error('Failed to fetch script: ' + urlStr);
      }
      res.setEncoding('utf-8');
      StreamUtil.readAll(res, onFetch);
    }

    req = http.request(urlStr, onRespond);
    session.domain.add(req);
    req.end();
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
      } else {
        var err = new Error('Invalid request: without any scripts');
        err.code = 400;
        throw err;
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
      var entryPoints;
      var result;
      var stepCount = 0;

      function main()
      {
        if (entryName in entryPoints) {
          return entryPoints[entryName](argObj);
        } else {
          var err = new Error('Unknown entry point: ' + entryName);
          err.code = 404;
          throw err;
        }
      }

      function step()
      {
        ++stepCount;
        // FIXME: throw an error when detect over steps.
      }

      assembly = executor.compile(script);
      context = assembly.context;
      entryPoints = context._entryPoints_;
      context['_main_'] = main;
      context['_step_'] = step;
      result = executor.run('_main_()', context);
      session.writeHead(200, { 'Content-Type': 'application/json' });
      session.end(JSON.stringify({
        'result': result,
      }));
    }

    parseRequest(session, run);
  }

  function handleCompile(session)
  {
    function compile(parsed) {
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

  function handleError(session, err)
  {
    var res = session.response;
    // FIXME: generate more pretty error.
    res.writeHead(('code' in err) ? err['code'] : 500);
    if (err.stack) {
      res.end(err.stack);
    } else {
      res.end(util.inspect(err));
    }
  }

  function handleRequest(req, res)
  {
    var session = new Session(req, res);
    session.setErrorCallback(function(err) { handleError(session, err); });
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
