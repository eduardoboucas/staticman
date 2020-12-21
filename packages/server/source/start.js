import StaticmanAPIServer from './server';

try {
  const api = new StaticmanAPIServer();

  api.start((port) => {
    console.log('Staticman API running on port', port);
  });
} catch (e) {
  console.error(e);
}
