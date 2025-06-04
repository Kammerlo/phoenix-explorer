import { render, screen } from "src/test-utils";

import ViewMoreThreeDots from "./index";

describe("ViewMoreThreeDots component", () => {
  it("should component render", () => {
    render(<ViewMoreThreeDots />);
    screen.logTestingPlaygroundURL();
  });
});
