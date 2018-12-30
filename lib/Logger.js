const logger = require('@dadi/logger')
const BunyanSlack = require('bunyan-slack')
const path = require('path')
const config = require(path.join(__dirname, '/../config'))

class Logger {
  constructor () {
    let options = {
      enabled: true,
      level: 'info',
      stream: process.stdout
    }

    if (typeof config.get('logging.slackWebhook') === 'string') {
      this.formatFn = t => '```\n' + t + '\n```'

      options.stream = new BunyanSlack({
        webhook_url: config.get('logging.slackWebhook')
      })
    }

    logger.init(options)
  }

  info (data) {
    const formattedData = typeof this.formatFn === 'function'
    ? this.formatFn(data)
    : data

    logger.info(formattedData)
  }
}

const instance = new Logger()

module.exports = instance
