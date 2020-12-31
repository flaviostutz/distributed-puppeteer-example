module.exports = {
    globalSetup: './jest.setup.js',
    globalTeardown: './jest.teardown.js',
    testEnvironment: './jest.environment.js',
    maxConcurrency: 1,
    preset: "jest-puppeteer"
}
