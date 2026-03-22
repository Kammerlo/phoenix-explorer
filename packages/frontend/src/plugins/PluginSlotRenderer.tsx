import React from "react";
import { Box } from "@mui/material";
import { usePlugins } from "./usePlugins";
import { PluginContext, PluginSlotName } from "./types";

interface PluginSlotRendererProps {
  slot: PluginSlotName;
  context: PluginContext;
  /** When true, plugins that declare metadataLabels are excluded (they render inside the metadata tab instead) */
  excludeMetadataPlugins?: boolean;
}

const PluginSlotRenderer: React.FC<PluginSlotRendererProps> = ({ slot, context, excludeMetadataPlugins }) => {
  const plugins = usePlugins(slot, excludeMetadataPlugins);

  if (plugins.length === 0) return null;

  return (
    <>
      {plugins.map((plugin) => (
        <Box key={plugin.manifest.id} sx={{ mt: 2 }}>
          <plugin.Component context={context} />
        </Box>
      ))}
    </>
  );
};

export default PluginSlotRenderer;
