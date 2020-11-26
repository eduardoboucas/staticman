import NodeRSA from 'node-rsa';

import config from '../config';

const key = new NodeRSA();

key.importKey(config.get('rsaPrivateKey'), 'private');

export const encrypt = (text) => {
  try {
    const encryptedText = key.encrypt(text, 'base64');

    return encryptedText;
  } catch (err) {
    return null;
  }
};

export const decrypt = (text) => {
  try {
    return key.decrypt(text, 'utf8');
  } catch (err) {
    return null;
  }
};
