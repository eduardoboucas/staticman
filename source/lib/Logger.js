import BunyanSlack from 'bunyan-slack';
import logger from '@dadi/logger';

import config from '../config';

class Logger {
  constructor() {
    const options = {
      enabled: true,
      level: 'info',
      stream: process.stdout,
    };

    if (typeof config.get('logging.slackWebhook') === 'string') {
      this.formatFn = (t) => `\`\`\`\n${t}\n\`\`\``;

      options.stream = new BunyanSlack({
        webhook_url: config.get('logging.slackWebhook'),
      });
    }

    logger.init(options);
  }

  info(data) {
    const formattedData = typeof this.formatFn === 'function' ? this.formatFn(data) : data;

    logger.info(formattedData);
  }
}

export default new Logger();
