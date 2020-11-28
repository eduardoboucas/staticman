import request from 'supertest';

import StaticmanAPI from '../../source/server';

const staticman = new StaticmanAPI().server;

describe('Encrypt endpoint', () => {
  it('responds with the text encrypted using the RSA key from the test config', async () => {
    const inputText = 'sometext';
    await request(staticman)
      .get(`/v2/encrypt/${inputText}`)
      .expect(200)
      .expect((response) => expect(response).not.toContain(inputText));
  });
});
