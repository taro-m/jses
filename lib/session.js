// vim:set sts=2 sw=2 tw=0 et:

module.exports = Session;

var domain = require('domain'),
    util = require('util'),
    url = require('url');

function Session(req, res)
{
  var that = this;
  var d = domain.create();

  function writeError(err)
  {
      res.writeHead(500);
      if (err.stack) {
        res.end(err.stack);
      } else {
        res.end(util.inspect(err));
      }
  }

  function handleError(err)
  {
    if (that.errorCallback) {
      try {
        that.errorCallback(err);
      } catch (err2) {
        writeError(err2);
      }
    } else {
      writeError(err);
    }
  }

  d.add(req);
  d.add(res);
  d.on('error', handleError);

  this.domain = d;
  this.request = req;
  this.url = url.parse(req.url, true);
  this.response = res;
  this.errorCallback = null;
}

Session.prototype.setErrorCallback = setErrorCallback;
Session.prototype.bind = bind;
Session.prototype.run = run;
Session.prototype.writeHead = writeHead;
Session.prototype.end = end;
Session.prototype.close = close;

function setErrorCallback(callback)
{
  this.errorCallback = callback;
}

function bind(callback)
{
  return this.domain.bind(callback);
}

function run(callback)
{
  this.domain.run(callback);
}

function writeHead()
{
  this.response.writeHead.apply(this.response, arguments);
}

function write()
{
  this.response.write.apply(this.response, arguments);
}

function end()
{
  var that = this;
  this.response.end.apply(this.response, arguments);
  this.response.on('close', function() {
    that.close();
  });
}

function close()
{
  if (this.domain) {
    this.domain.dispose();
    this.domain = null;
  }
}
