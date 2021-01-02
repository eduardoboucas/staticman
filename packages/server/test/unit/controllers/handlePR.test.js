// eslint-disable-next-line max-classes-per-file
import { GitHub, Review, Staticman } from '@staticman/core';

import { getMockRequest } from '../../helpers';
import * as sampleData from '../../helpers/sampleData';

let mockProcessMergeFn;
let req;

beforeEach(() => {
  jest.resetModules();
  mockProcessMergeFn = jest.fn();
  req = getMockRequest();
  jest.unmock('@staticman/core');
});

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

    class MockGitHub extends GitHub {
      // eslint-disable-next-line class-methods-use-this
      authenticate() {
        return jest.fn();
      }

      getReview(...args) {
        return mockGetReview.apply(this, args);
      }
    }

    jest.mock('@staticman/core', () => ({
      ...jest.requireActual('@staticman/core'),
      GitHub: MockGitHub,
    }));

    const handlePR = require('../../../source/controllers/handlePR').default;

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

      class MockGitHub extends GitHub {
        // eslint-disable-next-line class-methods-use-this
        authenticate() {
          return jest.fn();
        }

        deleteBranch(...args) {
          return mockDeleteBranch.apply(this, args);
        }

        getReview(...args) {
          return mockGetReview.apply(this, args);
        }
      }

      jest.mock('@staticman/core', () => ({
        ...jest.requireActual('@staticman/core'),
        GitHub: MockGitHub,
      }));

      const handlePR = require('../../../source/controllers/handlePR').default;

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

      class MockGitHub extends GitHub {
        // eslint-disable-next-line class-methods-use-this
        authenticate() {
          return jest.fn();
        }

        deleteBranch(...args) {
          return mockDeleteBranch.apply(this, args);
        }

        getReview(...args) {
          return mockGetReview.apply(this, args);
        }
      }

      class MockStaticman extends Staticman {
        processMerge(...args) {
          return mockProcessMergeFn.apply(this, args);
        }
      }

      jest.mock('@staticman/core', () => ({
        ...jest.requireActual('@staticman/core'),
        GitHub: MockGitHub,
        Staticman: MockStaticman,
      }));

      const handlePR = require('../../../source/controllers/handlePR').default;

      await handlePR(req.params.repository, pr);

      expect(mockGetReview).toHaveBeenCalledTimes(1);
      expect(mockGetReview.mock.calls[0][0]).toEqual(123);
      expect(mockDeleteBranch).toHaveBeenCalledTimes(1);
      expect(mockProcessMergeFn.mock.calls).toHaveLength(1);
    });
  });
});
