import { envelope } from "@shared/helpers/envelope";
describe("gateway jest", () => {
  it("resolves @shared and runs", () => {
    expect(envelope({ ok: true }).data).toEqual({ ok: true });
  });
});
