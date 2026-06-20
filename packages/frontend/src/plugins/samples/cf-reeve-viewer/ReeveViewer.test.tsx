import React from "react";
import { render as rtlRender, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import themes from "src/themes";
import ReeveViewer from "./ReeveViewer";
import { PluginContext } from "../../types";

// jsdom lacks matchMedia, which MUI components query.
window.matchMedia =
  window.matchMedia ||
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((() => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} })) as any);

const render = (ui: React.ReactElement) =>
  rtlRender(<ThemeProvider theme={themes.light}>{ui}</ThemeProvider>);

function makeContext(root: unknown): PluginContext {
  return {
    data: { metadata: [{ label: 1447, value: JSON.stringify({ "1447": root }) }] },
    network: "preprod",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiConnector: {} as any
  };
}

const REPORT_ROOT = {
  org: {
    name: "Cardano Foundation",
    currency_id: "ISO_4217:CHF",
    country_code: "CH",
    tax_id_number: "CHE-184477354"
  },
  metadata: { timestamp: "2025-10-08T04:20:58Z", version: "1.1" },
  type: "REPORT",
  interval: "MONTHLY",
  year: "2025",
  period: 12,
  subtype: "BALANCE_SHEET",
  data: {
    assets: {
      _o: 1,
      current_assets: {
        _o: 1,
        digital_assets: { v: 59984870.19, _o: 2 },
        cash_and_cash_equivalent: { v: 27614789.72, _o: 1 },
        "other_short-term_receivables": { v: 541957.86, _o: 3 },
        prepaid_expenses_and_accrued_income: { v: 2078664.52, _o: 4 }
      }
    }
  }
};

describe("ReeveViewer", () => {
  it("renders organisation name and humanized report context for a REPORT", () => {
    render(<ReeveViewer context={makeContext(REPORT_ROOT)} />);
    expect(screen.getByText("Cardano Foundation")).toBeInTheDocument();
    // subtype/interval/year/period are surfaced as a humanized subtitle
    expect(screen.getByText(/Balance Sheet/)).toBeInTheDocument();
    expect(screen.getByText(/Period 12/)).toBeInTheDocument();
  });

  it("renders leaf amounts formatted in the functional currency", () => {
    render(<ReeveViewer context={makeContext(REPORT_ROOT)} />);
    expect(screen.getByText("Cash and cash equivalent")).toBeInTheDocument();
    expect(screen.getByText("27,614,789.72")).toBeInTheDocument();
    expect(screen.getByText("Digital assets")).toBeInTheDocument();
  });

  it("shows a computed subtotal for a category", () => {
    render(<ReeveViewer context={makeContext(REPORT_ROOT)} />);
    // 59984870.19 + 27614789.72 + 541957.86 + 2078664.52 = 90,220,282.29
    // (appears for both `assets` and its sole child `current_assets`)
    expect(screen.getAllByText("90,220,282.29").length).toBeGreaterThan(0);
  });

  it("renders individual transactions with their number and type", () => {
    const txRoot = {
      org: { name: "Org" },
      type: "INDIVIDUAL_TRANSACTIONS",
      data: [
        {
          number: "JOURNAL8238",
          type: "Journal",
          date: "2025-04-07",
          accounting_period: "2025-04",
          items: [
            {
              amount: "30760.41",
              fx_rate: "0.10388169",
              document: { number: "JE-8238", currency: { id: "ISO_24165:ADA:HWGL1C2CK", cust_code: "ADA" } },
              event: { code: "1310T000", name: "Crypto inflow" }
            }
          ]
        }
      ]
    };
    render(<ReeveViewer context={makeContext(txRoot)} />);
    expect(screen.getByText(/JOURNAL8238/)).toBeInTheDocument();
    expect(screen.getByText("Journal")).toBeInTheDocument();
  });

  it("falls back to a generic view for an unknown type", () => {
    const unknownRoot = {
      org: { name: "Org X" },
      type: "FUTURE_STATEMENT",
      data: { hello: "world" }
    };
    render(<ReeveViewer context={makeContext(unknownRoot)} />);
    expect(screen.getByText("world")).toBeInTheDocument();
    // Type is surfaced both in the header chip and the generic-view note.
    expect(screen.getAllByText(/FUTURE_STATEMENT/).length).toBeGreaterThan(0);
  });

  it("renders nothing when no 1447 metadata is present", () => {
    const ctx: PluginContext = {
      data: { metadata: [{ label: 721, value: "{}" }] },
      network: "preprod",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiConnector: {} as any
    };
    const { container } = render(<ReeveViewer context={ctx} />);
    expect(container).toBeEmptyDOMElement();
  });
});
