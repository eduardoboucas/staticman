import objectPath from 'object-path';
import yaml from 'js-yaml';

export default class Config {
  constructor(rawContent) {
    this.data = yaml.safeLoad(rawContent, 'utf8');
  }

  get(key) {
    if (key) {
      return objectPath.get(this.data, key);
    }

    return this.data;
  }

  set(key, value) {
    this.data = objectPath.set(this.data, key, value);

    return this.data;
  }
}
