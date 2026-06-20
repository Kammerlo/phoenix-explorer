import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { PluginContext } from "../../types";
import { parseReeveMetadata } from "./parse";
import { getReeveRenderer, registerReeveType } from "./registry";
import ReeveHeader from "./components/ReeveHeader";
import ReportView from "./components/ReportView";
import TransactionsView from "./components/TransactionsView";
import GenericView from "./components/GenericView";

// ---------------------------------------------------------------------------
// Built-in type renderers. Adding support for a future Reeve `type` is a matter
// of writing a component and registering it here (or from anywhere at load time);
// unregistered types fall back to GenericView. See registry.ts.
// ---------------------------------------------------------------------------

registerReeveType({ type: "REPORT", label: "Financial Report", Component: ReportView });
registerReeveType({
  type: "INDIVIDUAL_TRANSACTIONS",
  label: "Individual Transactions",
  Component: TransactionsView
});

const ReeveViewer: React.FC<{ context: PluginContext }> = ({ context }) => {
  const root = useMemo(() => {
    const data = context.data as Record<string, unknown> | null;
    if (!data) return null;
    return parseReeveMetadata(data.metadata);
  }, [context.data]);

  if (!root) return null;

  const renderer = getReeveRenderer(root.type);
  const Body = renderer?.Component ?? GenericView;

  return (
    <Box>
      <ReeveHeader root={root} typeLabel={renderer?.label} />
      <Body root={root} />
    </Box>
  );
};

export default ReeveViewer;
