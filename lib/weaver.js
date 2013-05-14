// vim:set sts=2 sw=2 tw=0 et:

module.exports.WeaveError = WeaveError

module.exports.weave = weave

var util = require('util');
var UglifyJS = require('uglify-js');

util.inherits(WeaveError, Error);

function WeaveError(err)
{
  Error.call(this);
  if ('line' in err && 'col' in err) {
    this.message = util.format('%s [%d,%d]',
        err.message, err.line, err.col);
  } else {
    this.message = err.message;
  }
  this.cause = err;
}

function weave(script, keyfunc)
{
  try {
    return weave_raw(script, keyfunc);
  } catch (err) {
    throw new WeaveError(err);
  }
}

function weave_raw(script, keyfunc)
{
  var ast = UglifyJS.parse(script);
  var tt = new UglifyJS.TreeTransformer(null, function(node) {
    if (node instanceof UglifyJS.AST_Block) {
      var body = [];
      for (var i = 0; i < node.body.length; ++i) {
        body.push(UglifyJS.parse(keyfunc + '();'));
        body.push(node.body[i]);
      }
      if (body.length == 0) {
        body.push(UglifyJS.parse(keyfunc + '();'));
      }
      node.body = body;
      return node;
    } else if (node instanceof UglifyJS.AST_StatementWithBody
      && !(node.body instanceof UglifyJS.AST_Block)) {
        node.body = UglifyJS.parse(
          '{' + keyfunc + '();'+node.body.print_to_string()+'}');
        return node;
      }
  });
  var ast2 = ast.transform(tt);
  return ast2.print_to_string({ beautify: false });
}
