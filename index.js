try {
  const StaticmanAPI = require('./server')
  const api = new StaticmanAPI()

  const port = process.env.PORT || 3000
  const host = '0.0.0.0'

  api.app.listen(port, host, () => {
    console.log(`Staticman API running on http://${host}:${port}`)
  })
} catch (e) {
  console.error('Erro ao iniciar Staticman:', e)
}
