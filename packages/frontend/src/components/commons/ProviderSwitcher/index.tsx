import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  useTheme
} from "@mui/material";
import { MdClose } from "react-icons/md";
import { useSelector } from "react-redux";
import { RootState } from "src/stores/types";
import { ProviderConfig, ProviderType, setProviderConfig } from "src/stores/provider";

interface ProviderOption {
  type: ProviderType;
  label: string;
  description: string;
  defaultUrl: string;
  requiresApiKey?: boolean;
}

const BLOCKFROST_URLS: Record<string, string> = {
  mainnet: "https://cardano-mainnet.blockfrost.io/api/v0",
  preprod: "https://cardano-preprod.blockfrost.io/api/v0",
  preview: "https://cardano-preview.blockfrost.io/api/v0"
};

const PROVIDERS: ProviderOption[] = [
  {
    type: "GATEWAY",
    label: "Gateway (Blockfrost via Gateway)",
    description: "Proxies requests through the Phoenix Explorer gateway to Blockfrost.",
    defaultUrl: process.env.REACT_APP_API_URL || ""
  },
  {
    type: "YACI",
    label: "Yaci Store (Direct)",
    description: "Connects directly to a Yaci Store instance. Supports private testnets.",
    defaultUrl: "https://api.mainnet.yaci.xyz/api/v1"
  },
  {
    type: "BLOCKFROST",
    label: "Blockfrost (Direct)",
    description: "Connects directly to Blockfrost API from the browser. Requires an API key.",
    defaultUrl: BLOCKFROST_URLS[process.env.REACT_APP_NETWORK || "mainnet"],
    requiresApiKey: true
  }
];

interface ProviderSwitcherProps {
  open: boolean;
  onClose: () => void;
}

const ProviderSwitcher: React.FC<ProviderSwitcherProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const currentConfig = useSelector((state: RootState) => state.provider?.config);
  const [selectedType, setSelectedType] = useState<ProviderType>(currentConfig?.type ?? "GATEWAY");
  const [customUrl, setCustomUrl] = useState<string>(currentConfig?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState<string>(currentConfig?.apiKey ?? "");

  const selectedProvider = PROVIDERS.find((p) => p.type === selectedType)!;

  // In `npm run dev`, Vite proxies "/local-yaci" to a local Yaci Store same-origin
  // (zero CORS). On the hosted/built site, point at a local CORS bridge instead.
  const isDevBuild = import.meta.env.DEV;
  const localDevnetUrl = isDevBuild ? "/local-yaci/api/v1" : "http://localhost:8090/api/v1";

  // Reset local state when the dialog opens so it reflects the current config
  React.useEffect(() => {
    if (open && currentConfig) {
      setSelectedType(currentConfig.type);
      setCustomUrl(currentConfig.baseUrl);
      setApiKey(currentConfig.apiKey ?? "");
    }
  }, [open]);

  // When provider type changes, reset URL to that provider's default
  const handleTypeChange = (type: ProviderType) => {
    setSelectedType(type);
    const provider = PROVIDERS.find((p) => p.type === type)!;
    // Only reset URL if the current value belongs to a different provider
    if (type !== currentConfig?.type) {
      setCustomUrl(provider.defaultUrl);
      setApiKey("");
    }
  };

  const handleSave = () => {
    const network = process.env.REACT_APP_NETWORK || "mainnet";
    const baseUrl = customUrl || selectedProvider.defaultUrl;
    const config: ProviderConfig = {
      type: selectedType,
      baseUrl,
      apiKey: selectedType === "BLOCKFROST" ? apiKey : undefined,
      network
    };
    setProviderConfig(config);
    onClose();
    window.location.reload();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" component="span" fontWeight="bold">Switch Data Provider</Typography>
        <IconButton onClick={onClose} size="small"><MdClose /></IconButton>
      </DialogTitle>
      <DialogContent>
        <RadioGroup value={selectedType} onChange={(e) => handleTypeChange(e.target.value as ProviderType)}>
          {PROVIDERS.map((provider) => (
            <Box
              key={provider.type}
              sx={{
                border: `1px solid ${selectedType === provider.type ? theme.palette.primary.main : theme.palette.divider}`,
                borderRadius: 2,
                p: 2,
                mb: 1.5,
                cursor: "pointer",
                "&:hover": { borderColor: theme.palette.primary.main }
              }}
              onClick={() => handleTypeChange(provider.type)}
            >
              <FormControlLabel
                value={provider.type}
                control={<Radio size="small" />}
                label={<Typography fontWeight="bold">{provider.label}</Typography>}
                sx={{ mb: 0.5 }}
              />
              <Typography variant="body2" color="text.secondary" ml={4}>
                {provider.description}
              </Typography>
            </Box>
          ))}
        </RadioGroup>

        <Box mt={2}>
          {selectedType === "YACI" && (
            <Box
              sx={{
                mb: 1.5,
                p: 1.5,
                borderRadius: 2,
                border: `1px dashed ${theme.palette.divider}`
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Connect a local Yaci DevKit
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
                {isDevBuild
                  ? "Running in dev — requests are proxied same-origin via /local-yaci, so there's no CORS to configure. Just point at your devnet and reload."
                  : "This hosted site can't reach your localhost directly. Run a small CORS bridge in front of Yaci (see the setup guide); Chrome will then ask to “Allow local network” — click Allow. An HTTPS tunnel (cloudflared/ngrok) avoids the prompt entirely."}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => setCustomUrl(localDevnetUrl)}>
                Use local devnet URL
              </Button>
            </Box>
          )}
          <TextField
            fullWidth
            size="small"
            label="Base URL"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder={selectedProvider.defaultUrl}
            helperText={selectedType === "YACI" ? "Enter a custom Yaci Store URL for private testnets" : undefined}
            sx={{ mb: 1.5 }}
          />
          {selectedType === "BLOCKFROST" && (
            <TextField
              fullWidth
              size="small"
              label="Blockfrost API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              helperText="Your Blockfrost project_id. Keep it private."
            />
          )}
        </Box>

        <Box display="flex" justifyContent="flex-end" gap={1} mt={3}>
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save & Reload</Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ProviderSwitcher;
