import { render, screen } from "src/test-utils";

import PolygonShape from "./index";

const MockComponent = () => <span>Contents</span>;

describe("PolygonShape component", () => {
  it("should component render", () => {
    render(
      <PolygonShape>
        <MockComponent />
      </PolygonShape>
    );
    expect(screen.getByText(/contents/i)).toBeInTheDocument();
  });
});
