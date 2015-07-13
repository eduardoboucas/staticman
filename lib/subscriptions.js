var Datastore = require('nedb');

module.exports = function (file) {
	var db = new Datastore({
		filename: file,
		autoload: true
	});

	function getSubscriptionsForPost(post, callback, excludeEmails) {
		excludeEmails = excludeEmails || [];

		db.find({post: post}, function (err, docs) {
			var subscribers;

			if (!err) {
				subscribers = [];

				docs.forEach(function (element, index) {
					if (excludeEmails.indexOf(element.email) === -1) {
						subscribers.push(element);
					}
				});
			}

			callback.call(undefined, subscribers);
		});
	}

	function addSubscriberToPost(subscriber, post, callback) {
		getSubscriptionsForPost(post, function (subscriptions) {
			var alreadySubscribed = subscriptions.some(function (element, index, array) {
				return element.email === subscriber.email;
			});

			// Only adding a new subscription if the user isn't already subscribed
			if (!alreadySubscribed) {
				db.insert(subscriber, function (err, newDoc) {
					callback.call(undefined, newDoc);
				});				
			} else {
				callback.call(undefined, false);
			}
		});
	}

	function removeSubscription(id, callback) {
		db.remove({_id: id}, {}, function (err, numRemoved) {
			if (typeof(callback) == 'function') {
				callback.call(undefined, numRemoved);
			}
		});
	}

	return {
		get: getSubscriptionsForPost,
		add: addSubscriberToPost,
		remove: removeSubscription
	}
};