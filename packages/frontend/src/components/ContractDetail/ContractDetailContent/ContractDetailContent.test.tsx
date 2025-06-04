import { render, screen } from "src/test-utils";

import ContractDetailContent from "./index";

describe("ContractDetailContent component", () => {
  it("should component render", () => {
    render(<ContractDetailContent />);
    expect(screen.getByRole("tab", { name: /transaction/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /script/i })).toBeInTheDocument();
  });
});
