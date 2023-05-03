/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testRegex: "__tests__/dist/.+\\.spec\\.js$",
  transform: {
    '^.+\\.(ts)$': ['babel-jest', { rootMode: 'upward' }],
  }
};
