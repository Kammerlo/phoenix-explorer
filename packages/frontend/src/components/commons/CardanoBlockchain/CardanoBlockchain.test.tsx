import { render, screen } from "src/test-utils";

import CardanoBlockchain from "./index";

describe("CardanoBlockchain component", () => {
  it("should component render", () => {
    render(<CardanoBlockchain />);
    expect(screen.getByText(/cardano blockchain/i)).toBeInTheDocument();
  });
});
