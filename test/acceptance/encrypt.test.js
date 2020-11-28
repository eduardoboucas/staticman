import request from 'supertest';

import StaticmanAPI from '../../source/server';

const staticman = new StaticmanAPI().server;
const supportedApiVersions = [['v2'], ['v3']];

describe.each(supportedApiVersions)('API %s - Encrypt endpoint', (version) => {
  it('responds with the text encrypted using the RSA key from the test config', async () => {
    const inputText = 'sometext';
    await request(staticman)
      .get(`/${version}/encrypt/${inputText}`)
      .expect(200)
      .expect((response) => expect(response).not.toContain(inputText));
  });
});
