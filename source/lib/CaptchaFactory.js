import errorHandler from './ErrorHandler';
import HCaptcha from './HCaptcha';
import ReCaptcha from './ReCaptcha';

export default (service, options) => {
  let captcha
  switch (service) {
    case 'HCaptcha':
      captcha = new HCaptcha(options);
      break;
    case 'ReCaptcha':
      captcha = new ReCaptcha(options);
      break;
    default:
      throw errorHandler('CAPTCHA_SERVICE_MISSING')
  }
  captcha.verifyConfig();
  return captcha
};
