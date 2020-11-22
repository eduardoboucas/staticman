try {
  const StaticmanAPI = require('./server')
  const api = new StaticmanAPI()

  api.start(port => {
    console.log('Staticman API running on port', port)
  })
} catch (e) {
  console.error(e)
}
