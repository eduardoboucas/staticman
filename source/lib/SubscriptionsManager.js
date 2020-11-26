import md5 from 'md5';
import Notification from './Notification';

export default class SubscriptionsManager {
  constructor(parameters, dataStore, mailAgent) {
    this.parameters = parameters;
    this.dataStore = dataStore;
    this.mailAgent = mailAgent;
  }

  _getListAddress(entryId) {
    const compoundId = md5(`${this.parameters.username}-${this.parameters.repository}-${entryId}`);

    return `${compoundId}@${this.mailAgent.domain}`;
  }

  _get(entryId) {
    const listAddress = this._getListAddress(entryId);

    return new Promise((resolve, reject) => {
      this.mailAgent.lists(listAddress).info((err, value) => {
        if (err && err.statusCode !== 404) {
          return reject(err);
        }

        if (err || !value?.list) {
          return reject(Error('Mailing list not found'));
        }

        return resolve(listAddress);
      });
    });
  }

  send(entryId, fields, options, siteConfig) {
    return this._get(entryId).then((list) => {
      const notifications = new Notification(this.mailAgent);

      return notifications.send(list, fields, options, {
        siteName: siteConfig.get('name'),
      });
    });
  }

  set(entryId, email) {
    const listAddress = this._getListAddress(entryId);

    return new Promise((resolve, reject) => {
      const queue = [];

      return this._get(entryId).then((list) => {
        if (!list) {
          queue.push(
            new Promise((resolveList, rejectList) => {
              this.mailAgent.lists().create(
                {
                  address: listAddress,
                },
                (err, result) => {
                  if (err) return rejectList(err);

                  return resolveList(result);
                }
              );
            })
          );
        }

        return Promise.all(queue).then(() => {
          this.mailAgent
            .lists(listAddress)
            .members()
            .create(
              {
                address: email,
              },
              (err, result) => {
                // A 400 is fine-ish, means the address already exists
                if (err && err.statusCode !== 400) return reject(err);

                return resolve(result);
              }
            );
        });
      });
    });
  }
}
