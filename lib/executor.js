// vim:set sts=2 sw=2 tw=0 et:

module.exports = Executor;

var vm = require('vm');

function getWeave(raw)
{
  // TODO:
  return raw;
}

function Executor()
{
  // TODO: prepare context.
  this.context = {};
}

Executor.prototype.run = function(script, context)
{
  var result = vm.runInContext(script, context);
  return result;
}

Executor.prototype.compile = function(raw)
{
  var context = vm.createContext(this.context);
  var compiled = vm.createScript(getWeave(raw));
  var result = compiled.runInNewContext(conetxt);
  return {
    'raw': raw,
    'context': context,
    'compiled': compiled,
    'result': result,
  };
}
