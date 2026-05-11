// jest.setup.js — polyfills for jsdom test environment, run before each test
// file's modules are loaded.
const { TextEncoder, TextDecoder } = require("util");
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}
