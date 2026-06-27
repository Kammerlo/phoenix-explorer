import React, { useEffect, useState } from "react";
import { Box, Link, Skeleton, Tooltip, alpha, useTheme } from "@mui/material";
import { IoShieldCheckmark, IoShieldOutline, IoOpenOutline } from "react-icons/io5";

import { ApiConnector } from "src/commons/connector/ApiConnector";
import { ScriptVerification } from "@shared/dtos/scriptVerification.dto";

const REGISTRY_URL = "https://uplc.link/registry?hash=";

const short = (s?: string) => (s && s.length > 14 ? `${s.slice(0, 7)}…${s.slice(-4)}` : s || "");
const repoShort = (url?: string) =>
  url ? url.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\.git$/, "") : "";

/**
 * Source-provenance badge backed by uplc.link (via the gateway proxy). Shows
 * "Source verified · repo@commit" linking to the public proof when the script's
 * bytecode is provably built from open source, or a muted "Not verified" chip
 * (still a link to check/submit) otherwise. Renders only after a definitive
 * answer, so it never dead-ends on an unindexed script.
 */
const ScriptVerificationBadge: React.FC<{ scriptHash?: string }> = ({ scriptHash }) => {
  const theme = useTheme();
  const [data, setData] = useState<ScriptVerification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scriptHash) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    ApiConnector.getApiConnector()
      .getScriptVerification(scriptHash)
      .then((r) => {
        if (active) {
          setData(r.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scriptHash]);

  if (!scriptHash) return null;
  if (loading) return <Skeleton variant="rounded" width={170} height={26} sx={{ borderRadius: "8px" }} />;

  const verified = !!data?.verified;
  const ok = theme.palette.success?.main || "#16a34a";
  const muted = theme.palette.secondary.light;
  const color = verified ? ok : muted;
  const link = `${REGISTRY_URL}${scriptHash}`;
  const repo = repoShort(data?.repoUrl);

  const tooltip = verified
    ? `Bytecode provably built from ${data?.repoUrl}${data?.commit ? ` @ ${short(data?.commit)}` : ""}${
        data?.compiler ? ` (${data.compiler})` : ""
      }. Verified on uplc.link.`
    : "Source not verified on uplc.link. Click to check the registry or submit a verification.";

  return (
    <Tooltip arrow placement="top" title={tooltip}>
      <Box
        component={Link}
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          py: 0.4,
          borderRadius: "8px",
          textDecoration: "none",
          fontSize: "0.72rem",
          fontWeight: 700,
          color,
          cursor: "pointer",
          bgcolor: alpha(color, 0.1),
          border: `1px solid ${alpha(color, 0.35)}`,
          transition: "border-color .2s",
          "&:hover": { borderColor: alpha(color, 0.6) }
        }}
      >
        {verified ? <IoShieldCheckmark size={13} /> : <IoShieldOutline size={13} />}
        {verified ? "Source verified" : "Not verified"}
        {verified && repo && (
          <Box
            component="span"
            sx={{
              fontWeight: 500,
              opacity: 0.85,
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            · {repo}
            {data?.commit ? `@${short(data?.commit)}` : ""}
          </Box>
        )}
        <IoOpenOutline size={11} style={{ opacity: 0.7 }} />
      </Box>
    </Tooltip>
  );
};

export default ScriptVerificationBadge;
