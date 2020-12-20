import nock from 'nock';

export default class CatchAllApiMock {
  constructor(callback) {
    this.NUM_MOCKS = 7;

    this.mock = nock(/api\.github\.com/)
      .persist()
      .filteringPath(() => '/')
      .delete('/')
      .reply(200, callback)
      .filteringPath(() => '/')
      .get('/')
      .reply(200, callback)
      .filteringPath(() => '/')
      .head('/')
      .reply(200, callback)
      .filteringPath(() => '/')
      .merge('/')
      .reply(200, callback)
      .filteringPath(() => '/')
      .patch('/')
      .reply(200, callback)
      .filteringPath(() => '/')
      .post('/')
      .reply(200, callback)
      .filteringPath(() => '/')
      .put('/')
      .reply(200, callback);
  }

  hasIntercepted() {
    return this.mock.pendingMocks().length < this.NUM_MOCKS;
  }
}
