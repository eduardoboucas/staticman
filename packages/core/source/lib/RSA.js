import { config } from '@staticman/config';
import NodeRSA from 'node-rsa';

const key = new NodeRSA();

export const encrypt = (text) => {
  try {
    key.importKey(config.get('rsaPrivateKey'), 'private');

    const encryptedText = key.encrypt(text, 'base64');

    return encryptedText;
  } catch (err) {
    return null;
  }
};

export const decrypt = (text) => {
  try {
    key.importKey(config.get('rsaPrivateKey'), 'private');

    return key.decrypt(text, 'utf8');
  } catch (err) {
    return null;
  }
};
