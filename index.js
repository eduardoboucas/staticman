const StaticmanAPI = require('./server')

const api = new StaticmanAPI()

api.start((port, host) => {
  console.log('Staticman API running on', host ? 'host ' + host : '', 'port', port)
})
