import React, { useMemo } from "react";
import { Box, Card, CardMedia, Chip, Divider, Grid, Typography } from "@mui/material";
import { PluginContext } from "../../types";

interface CIP25Asset {
  name: string;
  image?: string;
  description?: string;
  mediaType?: string;
  [key: string]: unknown;
}

interface CIP25Metadata {
  [policyId: string]: {
    [assetName: string]: CIP25Asset;
  };
}

function resolveImage(image: string | string[]): string {
  const raw = Array.isArray(image) ? image.join("") : image;
  if (raw.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${raw.slice(7)}`;
  }
  return raw;
}

function parseCIP25(metadata: unknown): { policyId: string; assetName: string; asset: CIP25Asset }[] {
  if (!metadata || typeof metadata !== "object") return [];
  const meta = metadata as Record<string, unknown>;

  // metadata label 721 contains CIP-25 data
  const label721 = meta["721"] ?? meta[721];
  if (!label721 || typeof label721 !== "object") return [];

  const nfts: { policyId: string; assetName: string; asset: CIP25Asset }[] = [];
  const policies = label721 as CIP25Metadata;

  for (const policyId of Object.keys(policies)) {
    if (policyId === "version") continue;
    const policy = policies[policyId];
    if (!policy || typeof policy !== "object") continue;
    for (const assetName of Object.keys(policy)) {
      const asset = policy[assetName];
      if (asset && typeof asset === "object") {
        nfts.push({ policyId, assetName, asset: asset as CIP25Asset });
      }
    }
  }
  return nfts;
}

function getAttributes(asset: CIP25Asset): { key: string; value: string }[] {
  const skip = new Set(["name", "image", "description", "mediaType", "files"]);
  return Object.entries(asset)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => ({ key: k, value: String(v) }));
}

const CIP25Viewer: React.FC<{ context: PluginContext }> = ({ context }) => {
  const nfts = useMemo(() => {
    const data = context.data as Record<string, unknown> | null;
    if (!data) return [];
    // transaction detail has metadata field
    const metadata = data.metadata ?? data.txMetadata;
    return parseCIP25(metadata);
  }, [context.data]);

  if (nfts.length === 0) return null;

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" mb={1}>
        NFT Metadata (CIP-25)
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {nfts.map(({ policyId, assetName, asset }) => {
          const imageUrl = asset.image ? resolveImage(asset.image as string | string[]) : null;
          const attributes = getAttributes(asset);

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`${policyId}-${assetName}`}>
              <Card variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
                {imageUrl && (
                  <CardMedia
                    component="img"
                    image={imageUrl}
                    alt={asset.name ?? assetName}
                    sx={{ borderRadius: 1, mb: 1.5, maxHeight: 240, objectFit: "contain" }}
                  />
                )}
                <Typography variant="subtitle1" fontWeight="bold" noWrap>
                  {asset.name ?? assetName}
                </Typography>
                {asset.description && (
                  <Typography variant="body2" color="text.secondary" mt={0.5} mb={1}>
                    {String(asset.description)}
                  </Typography>
                )}
                {attributes.length > 0 && (
                  <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                    {attributes.map(({ key, value }) => (
                      <Chip
                        key={key}
                        label={`${key}: ${value}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.7rem" }}
                      />
                    ))}
                  </Box>
                )}
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default CIP25Viewer;
