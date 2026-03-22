import { PhoenixPlugin } from "../../types";
import ReeveViewer from "./ReeveViewer";

export const cfReeveViewerPlugin: PhoenixPlugin = {
  manifest: {
    id: "cf-reeve-viewer",
    name: "Cardano Foundation Reeve Viewer",
    version: "1.0.0",
    description:
      "Displays Cardano Foundation Reeve on-chain financial reporting metadata (label 1447), including organization info, individual transactions, and financial reports.",
    author: "Cardano Foundation",
    slots: [{ slot: "transaction-detail" }],
    metadataLabels: [1447],
  },
  Component: ReeveViewer,
};
