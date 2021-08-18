import md5 from 'md5';
import Notification from './Notification';

export default class SubscriptionsManager {
  constructor(parameters, dataStore, domain, mailAgent) {
    this.parameters = parameters;
    this.dataStore = dataStore;
    this.domain = domain;
    this.mailAgent = mailAgent;
  }

  _getListAddress(entryId) {
    const compoundId = md5(`${this.parameters.username}-${this.parameters.repository}-${entryId}`);

    return `${compoundId}@${this.domain}`;
  }

  async _get(entryId) {
    const listAddress = this._getListAddress(entryId);

    await this.mailAgent.lists.get(listAddress);

    return listAddress;
  }

  async send(entryId, fields, options, siteConfig) {
    const list = await this._get(entryId);
    const notifications = new Notification(this.domain, this.mailAgent);
    await notifications.send(list, fields, options, {
      siteName: siteConfig.get('name'),
    });
  }

  async set(entryId, email) {
    const listAddress = this._getListAddress(entryId);

    try {
      await this.mailAgent.lists.create({
        address: listAddress,
      });
    } catch {
      // ignore
    }

    try {
      await this.mailAgent.lists.members.createMember(listAddress, {
        address: email,
      });
    } catch {
      // ignore
    }
  }
}
