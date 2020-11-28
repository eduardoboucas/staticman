import request from 'supertest';

import { decrypt } from '../helpers';
import StaticmanAPI from '../../source/server';

const staticman = new StaticmanAPI().server;
const supportedApiVersions = [['v2'], ['v3']];

describe.each(supportedApiVersions)('API %s - Encrypt endpoint', (version) => {
  it('responds with the text query parameter encrypted using the RSA key from the test config', async () => {
    const inputText = 'sometext';

    expect.assertions(2);

    await request(staticman)
      .get(`/${version}/encrypt/${inputText}`)
      .expect(200)
      .expect((response) => {
        expect(response.text).not.toContain(inputText);
        expect(decrypt(response.text)).toBe(inputText);
      });
  });
});
