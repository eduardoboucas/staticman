import { getMockRequest } from '../../helpers';
import * as sampleData from '../../helpers/sampleData';
import GitHub from '../../../source/lib/GitHub';
import handlePR from '../../../source/controllers/handlePR';
import Review from '../../../source/lib/models/Review';
import Staticman from '../../../source/lib/Staticman';

jest.mock('../../../source/lib/GitHub');
jest.mock('../../../source/lib/Staticman');

let mockSetConfigPathFn;
let mockProcessMergeFn;
let req;

Staticman.mockImplementation(() => ({
  init: jest.fn(),
  setConfigPath: mockSetConfigPathFn,
  processMerge: mockProcessMergeFn,
}));

beforeEach(() => {
  mockSetConfigPathFn = jest.fn();
  mockProcessMergeFn = jest.fn();
  req = getMockRequest();
});

afterEach(() => jest.clearAllMocks());

describe('HandlePR controller', () => {
  test('ignores pull requests from branches not prefixed with `staticman_`', async () => {
    const pr = {
      number: 123,
      title: 'Some random PR',
      body: 'Unrelated review body',
      head: {
        ref: 'some-other-branch',
      },
      base: {
        ref: 'master',
      },
      merged: false,
      repository: {
        name: req.params.repository,
        owner: {
          login: req.params.username,
        },
      },
      state: 'open',
    };

    const mockReview = new Review(pr.title, pr.body, 'false', pr.head.ref, pr.base.ref);
    const mockGetReview = jest.fn().mockResolvedValue(mockReview);

    GitHub.mockImplementation(() => ({
      init: jest.fn(),
      getReview: mockGetReview,
    }));

    expect.assertions(1);

    await handlePR(req.params.repository, pr);
    expect(mockGetReview).toHaveBeenCalledTimes(1);
  });

  describe('processes notifications if the pull request has been merged', () => {
    test("do nothing if PR body doesn't match template", async () => {
      const pr = {
        number: 123,
        title: 'Add Staticman data',
        body: sampleData.prBody2,
        head: {
          ref: 'staticman_1234567',
        },
        base: {
          ref: 'master',
        },
        merged: true,
        repository: {
          name: req.params.repository,
          owner: {
            login: req.params.username,
          },
        },
        state: 'open',
      };

      const mockReview = new Review(pr.title, pr.body, 'false', pr.head.ref, pr.base.ref);
      const mockGetReview = jest.fn().mockResolvedValue(mockReview);
      const mockDeleteBranch = jest.fn();

      GitHub.mockImplementation(() => ({
        init: jest.fn(),
        getReview: mockGetReview,
        deleteBranch: mockDeleteBranch,
      }));

      expect.assertions(2);

      await handlePR(req.params.repository, pr);
      expect(mockGetReview).toHaveBeenCalledTimes(1);
      expect(mockDeleteBranch).not.toHaveBeenCalled();
    });

    test('delete the branch if the pull request is closed', async () => {
      const pr = {
        number: 123,
        title: 'Add Staticman data',
        body: sampleData.prBody1,
        head: {
          ref: 'staticman_1234567',
        },
        base: {
          ref: 'master',
        },
        merged: true,
        repository: {
          name: req.params.repository,
          owner: {
            login: req.params.username,
          },
        },
        state: 'closed',
      };

      const mockReview = new Review(pr.title, pr.body, 'merged', pr.head.ref, pr.base.ref);
      const mockDeleteBranch = jest.fn();
      const mockGetReview = jest.fn().mockResolvedValue(mockReview);

      GitHub.mockImplementation(() => ({
        init: jest.fn(),
        getReview: mockGetReview,
        deleteBranch: mockDeleteBranch,
      }));

      expect.assertions(5);

      await handlePR(req.params.repository, pr);
      expect(mockGetReview).toHaveBeenCalledTimes(1);
      expect(mockGetReview).toHaveBeenCalledWith(123);
      expect(mockDeleteBranch).toHaveBeenCalledTimes(1);
      expect(mockSetConfigPathFn).toHaveBeenCalledTimes(1);
      expect(mockProcessMergeFn).toHaveBeenCalledTimes(1);
    });
  });
});
