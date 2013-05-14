// vim:set sts=2 sw=2 tw=0 et:

module.exports = Executor;

var vm = require('vm');
var weaver = require('./weaver');

function sanitizeScript(raw)
{
  // FIXME: make weaver more robust.
  return weaver.weave(raw, '_step_');
}

function Executor(context)
{
  this.context = vm.createContext(context);
  // add dummy step counter function.
  this.context['_step_'] = function() {};
}

Executor.prototype.run = function(script, context)
{
  var result = vm.runInContext(script, context);
  return result;
}

Executor.prototype.compile = function(raw)
{
  var context = vm.createContext(this.context);
  var compiled = vm.createScript(sanitizeScript(raw));
  var result;
  var stepCount = 0;
  context['_step_'] = function() {
    ++stepCount;
    // FIXME: throw an error when detect over steps.
  }
  result = compiled.runInNewContext(conetxt);
  return {
    'raw': raw,
    'context': context,
    'compiled': compiled,
    'result': result,
  };
}
