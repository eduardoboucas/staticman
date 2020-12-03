import request from 'supertest';

import StaticmanAPI from '../../source/server';
import pkg from '../../package.json';

const staticman = new StaticmanAPI().server;

describe('Home endpoint', () => {
  // eslint-disable-next-line jest/expect-expect
  it('responds with a greeting including the Staticman version', async () => {
    const expectedResponse = `Hello from Staticman version ${pkg.version}!`;

    await request(staticman).get('/').expect(200).expect(expectedResponse);
  });
});
