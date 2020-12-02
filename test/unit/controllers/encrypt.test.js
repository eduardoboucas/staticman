import encryptController from '../../../source/controllers/encrypt';
import { encrypt } from '../../../source/lib/RSA';
import * as helpers from '../../helpers';

jest.mock('../../../source/lib/RSA');

let req;
let res;

beforeEach(() => {
  req = helpers.getMockRequest();
  res = helpers.getMockResponse();
});

describe('Encrypt controller', () => {
  test('returns an encrypted version of the given text', () => {
    req.params.text = 'This is the text to encrypt';
    encrypt.mockReturnValue('Encrypted text');

    encryptController(req, res);

    expect(res.send).toHaveBeenCalledWith('Encrypted text');
  });
});
