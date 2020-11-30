import NodeRSA from 'node-rsa';

import config from '../config';

const key = new NodeRSA();
key.importKey(config.get('rsaPrivateKey'), 'private');

export function encrypt(text) {
  return key.encrypt(text, 'base64');
}

export function decrypt(text) {
  return key.decrypt(text, 'utf8');
}
