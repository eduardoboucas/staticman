import NodeRSA from 'node-rsa';

import config from '../config';

const key = new NodeRSA();
key.importKey(config.get('rsaPrivateKey'), 'private');

/**
 * Decrypt a string using the RSA private key from the config
 * @param {String} text - text to be decrypted
 */
export function encrypt(text) {
  return key.encrypt(text, 'base64');
}

/**
 * Decrypt a string using the RSA private key from the config
 * @param {String} text - text to be encrypted
 * @returns {String} - encrypted string
 */
export function decrypt(text) {
  return key.decrypt(text, 'utf8');
}
