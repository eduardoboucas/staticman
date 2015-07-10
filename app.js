var express = require('express');
var app = express();
var exec = require('child_process').exec;
var md5 = require('MD5');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function escapeshellarg(arg) {
  //  discuss at: http://phpjs.org/functions/escapeshellarg/
  // original by: Felix Geisendoerfer (http://www.debuggable.com/felix)
  // improved by: Brett Zamir (http://brett-zamir.me)
  //   example 1: escapeshellarg("kevin's birthday");
  //   returns 1: "'kevin\\'s birthday'"

  var ret = '';

  ret = arg.replace(/[^\\]'/g, function(m, i, s) {
    return m.slice(0, 1) + '\\\'';
  });

  return "'" + ret + "'";
}

function parseParameter(parameter) {
	if (!parameter) {
		return false;
	}

	parameter = parameter.trim();

	if (!parameter.length) {
		return false;
	}

	return escapeshellarg(parameter);
}

app.post('/comments', function (req, res) {
	var requiredParameters = ['name', 'email', 'message', 'post', 'post-url'];
	var parsedParameters = {};
	var validated = true;

	requiredParameters.forEach(function (element, index) {
		parsedParameters[element] = parseParameter(req.body[element]);
		validated = validated && parsedParameters[element];
	});

	//exec(command, function(error, stdout, stderr){ callback(stdout); });

	res.send(validated ? 'YES' : 'NO');
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});