import StaticmanAPI from './server';

try {
  const api = new StaticmanAPI();

  api.start((port) => {
    console.log('Staticman API running on port', port);
  });
} catch (e) {
  console.error(e);
}
