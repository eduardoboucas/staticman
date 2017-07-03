# Contributing

Your contributions to Staticman are more than welcome! Here are a few things to keep in mind:

1. The codebase adheres to the [StandardJS](https://standardjs.com/) style guide and code will be validated against it by the CI tool. Please take a moment to familiarise yourself with the basic rules before writing any code.

1. Staticman uses [Jest](https://facebook.github.io/jest/) for unit and acceptance tests. You can run the suite with `npm test`. Make sure existing tests are passing and, if you're adding a new feature, make sure it comes with a set of new tests.

1. Staticman is [Eduardo's](https://eduardoboucas.com) side project. It doesn't generate any revenue whatsoever and takes a fair amount of time to maintain/update. Whilst your idea for a new feature is probably awesome, please don't be upset if you're told that we won't be accepting it because we can't commit to maintaining it. By keeping the project small and focused we reduce the burden of its maintenance. Please open an issue for discussion before sending a pull request.

1. All pull requests should be sent against the `dev` branch, not `master`.

1. Any pull requests merged to `dev` will automatically be merged to the preview instance, running at `https://dev.staticman.net`. This works as our QA environment to ensure features work as expected before releasing them to the public API.
