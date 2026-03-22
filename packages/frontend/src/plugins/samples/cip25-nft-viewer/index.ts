import { PhoenixPlugin } from "../../types";
import CIP25Viewer from "./CIP25Viewer";

export const cip25NftViewerPlugin: PhoenixPlugin = {
  manifest: {
    id: "cip25-nft-viewer",
    name: "CIP-25 NFT Viewer",
    version: "1.0.0",
    description: "Displays NFT metadata from CIP-25 (label 721) in transaction detail pages, showing images, names, descriptions, and attributes.",
    author: "Phoenix Explorer",
    slots: [{ slot: "transaction-detail" }],
    metadataLabels: [721]
  },
  Component: CIP25Viewer
};
