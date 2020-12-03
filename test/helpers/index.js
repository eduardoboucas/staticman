import cloneDeep from 'lodash/cloneDeep';
import objectPath from 'object-path';
import markdownTable from 'markdown-table';
import yaml from 'js-yaml';

import * as RSA from '../../source/lib/RSA';
import * as sampleData from './sampleData';
import SiteConfig from '../../source/siteConfig';

export const fields = {
  name: 'Eduardo Bouças',
  email: 'mail@eduardoboucas.com',
  url: 'https://eduardoboucas.com',
  message: 'This is a sample comment',
};

export const parameters = {
  branch: 'master',
  property: 'comments',
  repository: 'foobar',
  username: 'johndoe',
  version: '2',
};

const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8');
const siteConfig = SiteConfig(parsedConfig.comments);

export function decrypt(text) {
  return RSA.decrypt(text);
}

export function encrypt(text) {
  return RSA.encrypt(text);
}

export function getConfig() {
  const siteConfigCopy = cloneDeep(siteConfig);
  siteConfigCopy.getRaw = (key) => objectPath.get(parsedConfig, `comments.${key}`);

  return siteConfigCopy;
}

export function getConfigObject() {
  return {
    file: 'path/to/staticman.yml',
    path: 'comments',
  };
}

export function getFields() {
  return { ...fields };
}

export function getFieldsTable() {
  const rows = [['Field', 'Content']];

  Object.keys(fields).forEach((field) => {
    rows.push([field, fields[field]]);
  });

  return markdownTable(rows);
}

export function getMockRequest() {
  return {
    headers: {
      'x-forwarded-for': '123.456.78.9',
    },
    params: { ...parameters },
  };
}

export function getMockResponse() {
  const redirectFn = jest.fn();
  const sendFn = jest.fn();
  // eslint-disable-next-line no-unused-vars
  const statusFn = jest.fn((_code) => ({
    send: sendFn,
  }));

  return {
    redirect: redirectFn,
    send: sendFn,
    status: statusFn,
  };
}

export const getParameters = () => {
  return { ...parameters };
};

export function getParsedConfig() {
  return cloneDeep(parsedConfig);
}

export function getUserAgent() {
  return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';
}
