var Staticman = require('../lib/Staticman')

module.exports = (config) => {
  return ((req, res) => {
    var ua = config.uaTrackingId ? require('universal-analytics')(config.uaTrackingId) : null
    var fields = req.query.fields || req.body.fields
    var options = req.query.options || req.body.options || {}

    Object.assign(options, req.params)

    var staticman = new Staticman(options, config)

    staticman.setIp(req.headers['x-forwarded-for'] || req.connection.remoteAddress)

    staticman.process(fields, options).then((data) => {
      if (data.redirect) {
        res.redirect(data.redirect)
      } else {
        res.send({
          success: true,
          fields: data.fields
        })
      }

      if (ua) {
        ua.event('Entries', 'New entry').send()
      }
    }).catch((err) => {
      console.log('** ERR:', err.stack || err);
      res.status(500).send(err)

      if (ua) {
        ua.event('Entries', 'New entry error').send()
      }
    })
  })
}
