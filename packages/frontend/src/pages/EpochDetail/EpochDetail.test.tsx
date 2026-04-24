import { render, screen } from "src/test-utils";
import useFetch from "src/hooks/useFetch";

import EpochDetail from "./index";

jest.mock("src/hooks/useFetch");

describe("EpochDetail component", () => {
  it("should component render the empty image", () => {
    const mockUseFetch = useFetch as jest.Mock;
    mockUseFetch.mockReturnValue({
      data: null,
      initialized: true
    });
    render(<EpochDetail />);
    expect(screen.getByAltText("empty icon")).toBeInTheDocument();
  });
});
