
module.exports = {
    ...require('./jest.config.js'),
    reporters: [
        'default',
        ['jest-slow-test-reporter', { threshold: 1000, onlyShowSlowest: 10 }]
    ],
    setupFilesAfterEnv: [
        '<rootDir>/tests/setup.js',
        '<rootDir>/tests/performance-setup.js'
    ]
};