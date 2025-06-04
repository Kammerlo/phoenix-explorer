import { render, screen } from "src/test-utils";

import FooterMenu from "./index";

describe("FooterMenu component", () => {
  it("should component render", () => {
    render(<FooterMenu />);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });
});
