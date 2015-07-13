module.exports = function () {
	function sanitize(arg) {
		var ret = '';

		ret = arg.replace(/[^\\]'/g, function(m, i, s) {
			return m.slice(0, 1) + '\\\'';
		});

		return ret;
	}

	function parseParameter(parameter, sanitizeFunction) {
		if (!parameter) {
			return false;
		}

		parameter = parameter.trim();

		if (!parameter.length) {
			return false;
		}

		return sanitizeFunction.call(undefined, parameter);
	}

	function parseDate(date) {
		var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

		var dateHours = date.getHours();
		var hours = (dateHours > 12) ? (dateHours - 12) : dateHours;
		var meridiem = (dateHours >= 12) ? 'pm' : 'am';

		var formattedDate = months[date.getMonth()] + ' ' + 
							date.getDate() + ', ' + 
							date.getFullYear() + ', ' + 
							hours + ':' + date.getMinutes() + ' ' + meridiem;

		return formattedDate;
	}

	return {
		sanitize: sanitize,
		parseParameter: parseParameter,
		parseDate: parseDate
	}
}();