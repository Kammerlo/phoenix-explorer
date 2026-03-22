import React from "react";
import {
  Box,
  Card,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  Switch,
  Typography
} from "@mui/material";
import { usePluginManager } from "src/plugins/usePlugins";
import { PluginSlotName } from "src/plugins/types";

const SLOT_LABELS: Record<PluginSlotName, string> = {
  "transaction-detail": "Transaction Detail",
  "address-detail": "Address Detail",
  "token-detail": "Token Detail",
  "block-detail": "Block Detail",
  "governance-detail": "Governance Action Detail",
  "drep-detail": "DRep Detail",
  "pool-detail": "Pool Detail",
  "home-dashboard": "Home Dashboard",
  "global-sidebar": "Global Sidebar"
};

const PluginManager: React.FC = () => {
  const { plugins, isEnabled, toggle } = usePluginManager();

  return (
    <Container sx={{ pt: 4, pb: 6 }}>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Plugin Manager
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Enable or disable plugins that add extra functionality to the explorer.
      </Typography>

      {plugins.length === 0 && (
        <Typography color="text.secondary">No plugins registered.</Typography>
      )}

      {plugins.map((plugin) => (
        <Card key={plugin.manifest.id} variant="outlined" sx={{ mb: 2, p: 3, borderRadius: 2 }}>
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box flex={1}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography variant="h6" fontWeight="bold">
                  {plugin.manifest.name}
                </Typography>
                <Chip label={`v${plugin.manifest.version}`} size="small" variant="outlined" />
              </Box>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                {plugin.manifest.description}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Author: {plugin.manifest.author}
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {plugin.manifest.slots.map((s) => (
                  <Chip
                    key={s.slot}
                    label={SLOT_LABELS[s.slot] ?? s.slot}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
                {plugin.manifest.metadataLabels?.map((label) => (
                  <Chip
                    key={label}
                    label={`Metadata label ${label}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={isEnabled(plugin.manifest.id)}
                  onChange={(e) => toggle(plugin.manifest.id, e.target.checked)}
                  color="primary"
                />
              }
              label={isEnabled(plugin.manifest.id) ? "Enabled" : "Disabled"}
              labelPlacement="start"
            />
          </Box>
        </Card>
      ))}

      <Divider sx={{ my: 4 }} />
      <Typography variant="body2" color="text.secondary">
        Plugin preferences are saved in your browser. To add a new plugin, see the{" "}
        <a
          href="https://github.com/Kammerlo/phoenix-explorer/blob/main/docs/plugin-development.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          plugin development guide
        </a>.
      </Typography>
    </Container>
  );
};

export default PluginManager;
