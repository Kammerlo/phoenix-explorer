import { render, screen } from "src/test-utils";
import { formatADAFull } from "src/commons/utils/helper";

import { AdaValue } from "./index";

describe("ADAIcon component", () => {
  it("should component render", () => {
    const value = 100000000;
    render(<AdaValue value={value} />);
    expect(screen.getByText(formatADAFull(value))).toBeInTheDocument();
    expect(screen.getByTestId("ada-icon")).toBeInTheDocument();
  });
});
