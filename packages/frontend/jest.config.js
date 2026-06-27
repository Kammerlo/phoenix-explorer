module.exports = {
  testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/jest.setup.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setupAfterEnv.js"],
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/../shared/src/$1",
    "^src/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "jest-transform-stub",
    // vite-plugin-svgr imports (`foo.svg?react`) and plain asset imports (incl. query suffixes).
    "\\.svg\\?react$": "jest-transform-stub",
    "\\.(svg|png|jpg|jpeg|gif|webp)(\\?.*)?$": "jest-transform-stub"
  }
};
