module.exports = function (apiKey, domain, sender) {
	var templatesDir = './email-templates/';
	var subjectExp = /<!--(.*?)-->/;
	var fs = require('fs');
	var mailgun = require('mailgun-js')({
		apiKey: apiKey,
		domain: domain
	});

	function readTemplate(template, callback) {
		fs.readFile(templatesDir + template + '.template.html', 'utf8', function (err, data) {
			if (!err) {
				var subject = data.match(subjectExp).slice(1)[0].trim();

				callback.call(undefined, subject, data);
			}
		});		
	}

	function send(template, recipient, content, callback) {
		readTemplate(template, function (subject, html) {
			for (placeholder in content) {
				if (content.hasOwnProperty(placeholder)) {
					html = html.replace('{{ ' + placeholder + ' }}', content[placeholder]);
				}
			}

			var message = {
				from: sender,
				to: recipient,
				subject: subject,
				html: html
			};

			mailgun.messages().send(message, function (error, body) {
				if (typeof(callback) == 'function') {
					callback.call(undefined, body, error);	
				}
			});
		});
	}

	return {
		send: send
	}
};