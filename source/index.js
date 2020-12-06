import checkRecaptcha from './lib/ReCaptcha';
import { getInstance } from './lib/ErrorHandler';
import Staticman from './lib/Staticman';

export { checkRecaptcha, getInstance as getErrorHandlerInstance, Staticman };
