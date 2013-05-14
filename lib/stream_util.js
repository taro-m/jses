// vim:set sts=2 sw=2 tw=0 et:

module.exports.readAll = readAll;

function readAll(stream, callback)
{
  var body = '';

  function onData(data)
  {
    body += data;
  }

  function onEnd()
  {
    callback(body);
  }

  if ('read' in stream) {
    stream.on('readable', function() { onData(stream.read()); });
  } else {
    stream.on('data', onData);
  }
  stream.on('end', onEnd);
}
