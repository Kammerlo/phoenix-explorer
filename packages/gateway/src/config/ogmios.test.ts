// Mock dotenv so the real .env file on disk cannot override env vars that the
// test has deliberately deleted / set.
jest.mock("dotenv", () => ({
  config: jest.fn().mockReturnValue({ parsed: {} }),
}));

describe("config/ogmios", () => {
  const OLD = { ...process.env };
  afterEach(() => { process.env = { ...OLD }; jest.resetModules(); });

  it("is inactive when OGMIOS_URL unset", async () => {
    delete process.env.OGMIOS_URL;
    process.env.API_KEY = "x";
    jest.resetModules();
    const mod = await import("./ogmios");
    expect(mod.IS_OGMIOS_ACTIVE).toBe(false);
    expect(mod.OGMIOS).toBeNull();
  });

  it("is active and builds a client when OGMIOS_URL set", async () => {
    process.env.OGMIOS_URL = "http://ogmios";
    process.env.KUPO_URL = "http://kupo";
    jest.resetModules();
    const mod = await import("./ogmios");
    expect(mod.IS_OGMIOS_ACTIVE).toBe(true);
    expect(mod.OGMIOS).not.toBeNull();
    expect(mod.KUPO).not.toBeNull();
  });
});
