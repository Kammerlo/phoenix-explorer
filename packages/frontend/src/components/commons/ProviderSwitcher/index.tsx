import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
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
import { FunctionEnum } from "src/commons/connector/types/FunctionEnum";
import { GatewayConnector } from "src/commons/connector/gateway/gatewayConnector";
import { YaciConnector } from "src/commons/connector/yaci/yaciConnector";
import { BlockfrostConnector } from "src/commons/connector/blockfrost/blockfrostConnector";

interface ProviderOption {
  type: ProviderType;
  label: string;
  description: string;
  defaultUrl: string;
  supportedFeatures: FunctionEnum[];
  requiresApiKey?: boolean;
}

const BLOCKFROST_URLS: Record<string, string> = {
  mainnet: "https://cardano-mainnet.blockfrost.io/api/v0",
  preprod: "https://cardano-preprod.blockfrost.io/api/v0",
  preview: "https://cardano-preview.blockfrost.io/api/v0"
};

const FEATURE_LABELS: Record<FunctionEnum, string> = {
  [FunctionEnum.EPOCH]: "Epochs",
  [FunctionEnum.BLOCK]: "Blocks",
  [FunctionEnum.TRANSACTION]: "Transactions",
  [FunctionEnum.ADDRESS]: "Addresses",
  [FunctionEnum.TOKENS]: "Tokens",
  [FunctionEnum.POOL]: "Pools",
  [FunctionEnum.GOVERNANCE]: "Governance",
  [FunctionEnum.DREP]: "DReps",
  [FunctionEnum.PROTOCOL_PARAMETER]: "Protocol Params",
  [FunctionEnum.STAKE_ADDRESS_REGISTRATION]: "Stake Registrations",
  [FunctionEnum.POOL_REGISTRATION]: "Pool Registrations"
};

const PROVIDERS: ProviderOption[] = [
  {
    type: "GATEWAY",
    label: "Gateway (Blockfrost via Backend)",
    description: "Proxies requests through the Phoenix Explorer backend to Blockfrost.",
    defaultUrl: process.env.REACT_APP_API_URL || "",
    supportedFeatures: new GatewayConnector("").getSupportedFunctions()
  },
  {
    type: "YACI",
    label: "Yaci Store (Direct)",
    description: "Connects directly to a Yaci Store instance. Supports private testnets.",
    defaultUrl: "https://api.mainnet.yaci.xyz/api/v1",
    supportedFeatures: new YaciConnector("").getSupportedFunctions()
  },
  {
    type: "BLOCKFROST",
    label: "Blockfrost (Direct)",
    description: "Connects directly to Blockfrost API from the browser. Requires an API key.",
    defaultUrl: BLOCKFROST_URLS[process.env.REACT_APP_NETWORK || "mainnet"],
    supportedFeatures: new BlockfrostConnector("", "").getSupportedFunctions(),
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
        <Typography variant="h6" fontWeight="bold">Switch Data Provider</Typography>
        <IconButton onClick={onClose} size="small"><MdClose /></IconButton>
      </DialogTitle>
      <DialogContent>
        <RadioGroup value={selectedType} onChange={(e) => setSelectedType(e.target.value as ProviderType)}>
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
              onClick={() => setSelectedType(provider.type)}
            >
              <FormControlLabel
                value={provider.type}
                control={<Radio size="small" />}
                label={<Typography fontWeight="bold">{provider.label}</Typography>}
                sx={{ mb: 0.5 }}
              />
              <Typography variant="body2" color="text.secondary" ml={4} mb={1}>
                {provider.description}
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5} ml={4}>
                {provider.supportedFeatures.map((f) => (
                  <Chip key={f} label={FEATURE_LABELS[f] ?? f} size="small" color="primary" variant="outlined" />
                ))}
              </Box>
            </Box>
          ))}
        </RadioGroup>

        <Box mt={2}>
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
