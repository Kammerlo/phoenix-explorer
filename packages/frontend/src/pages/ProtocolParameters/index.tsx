import {
  Box,
  Container,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useTheme
} from "@mui/material";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MdGridView, MdTableRows } from "react-icons/md";

import {
  CollateralSection,
  DepositsSection,
  DetailedView,
  FeesSection,
  GovernanceSection,
  Hero,
  PoolsSection,
  ProtocolVersionFooter,
  RewardsSection,
  ScriptsSection,
  SectionAnchorNav,
  ThroughputSection
} from "src/components/ProtocolParameters";
import { SECTIONS } from "src/components/ProtocolParameters/playground/liveContext";
import { ApiConnector } from "src/commons/connector/ApiConnector";

// @ts-ignore — TProtocolParam is a global declaration
import { TProtocolParam } from "src/types/protocol";

type ViewMode = "visual" | "detail";

const DEFAULT_SECTION = SECTIONS[0]?.id ?? "fees";

const validSection = (id: string | undefined): string =>
  SECTIONS.some((s) => s.id === id) ? (id as string) : DEFAULT_SECTION;

const ProtocolParameters: React.FC = () => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const reduced = useReducedMotion();
  const [params, setParams] = useState<TProtocolParam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("visual");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [epoch, setEpoch] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_SECTION;
    return validSection(window.location.hash.replace(/^#/, ""));
  });

  useEffect(() => {
    document.title = "Protocol Parameters | Phoenix Explorer";
    const apiConnector = ApiConnector.getApiConnector();

    apiConnector
      .getCurrentProtocolParameters()
      .then((r) => {
        if (r.data) {
          setParams(r.data);
          setLastUpdated(r.lastUpdated ?? Date.now());
        } else {
          setError(r.error ?? "Failed to load parameters");
        }
      })
      .catch(() => setError("Failed to load protocol parameters"))
      .finally(() => setLoading(false));

    apiConnector
      .getDashboardStats()
      .then((r) => {
        const no = r.data?.currentEpoch?.no;
        if (typeof no === "number") setEpoch(no);
      })
      .catch(() => {
        /* dashboard stats are nice-to-have for the Live·Epoch chip */
      });
  }, []);

  // Sync hash → state when the user uses the back / forward buttons.
  useEffect(() => {
    const handler = () => setActiveId(validSection(window.location.hash.replace(/^#/, "")));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
    if (typeof history !== "undefined") {
      history.replaceState(null, "", `#${id}`);
    }
  }, []);

  const activeSection = useMemo(() => {
    if (!params) return null;
    switch (activeId) {
      case "fees":       return <FeesSection params={params} />;
      case "throughput": return <ThroughputSection params={params} />;
      case "deposits":   return <DepositsSection params={params} />;
      case "rewards":    return <RewardsSection params={params} />;
      case "pools":      return <PoolsSection params={params} />;
      case "scripts":    return <ScriptsSection params={params} />;
      case "collateral": return <CollateralSection params={params} />;
      case "governance": return <GovernanceSection params={params} />;
      case "version":    return <ProtocolVersionFooter params={params} />;
      default:           return <FeesSection params={params} />;
    }
  }, [activeId, params]);

  return (
    <Container maxWidth="xl" sx={{ pt: { xs: 2, sm: 3 }, pb: 6 }}>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v as ViewMode)}
          size="small"
        >
          <ToggleButton value="visual" aria-label="Visual view">
            <MdGridView size={18} />
            <Box component="span" ml={0.75} sx={{ display: { xs: "none", sm: "inline" } }}>
              Visual
            </Box>
          </ToggleButton>
          <ToggleButton value="detail" aria-label="All-parameters table">
            <MdTableRows size={18} />
            <Box component="span" ml={0.75} sx={{ display: { xs: "none", sm: "inline" } }}>
              All Parameters
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading && (
        <Box display="flex" flexDirection="column" gap={2}>
          <Skeleton variant="rounded" height={260} />
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={420} />
        </Box>
      )}

      {error && !loading && (
        <Box
          sx={{
            p: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.error.main, 0.4)}`,
            bgcolor: alpha(theme.palette.error.main, 0.08)
          }}
        >
          <Typography color="error" fontWeight={700}>
            {error}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Try switching providers or refreshing the page.
          </Typography>
        </Box>
      )}

      {params && !loading && viewMode === "visual" && (
        <>
          <Hero params={params} epoch={epoch} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "220px 1fr" },
              gap: { xs: 0, md: 4 },
              alignItems: "start"
            }}
          >
            <SectionAnchorNav activeId={activeId} onSelect={handleSelect} />
            <Box sx={{ minWidth: 0 }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeId}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={reduced ? undefined : { opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  {activeSection}
                </motion.div>
              </AnimatePresence>
            </Box>
          </Box>
          {lastUpdated && (
            <Typography
              variant="caption"
              color="text.disabled"
              display="block"
              sx={{ mt: 4, textAlign: "center" }}
            >
              Last refreshed {new Date(lastUpdated).toLocaleTimeString()}
            </Typography>
          )}
        </>
      )}

      {params && !loading && viewMode === "detail" && (
        <Box mt={2}>
          <DetailedView params={params} />
        </Box>
      )}
    </Container>
  );
};

export default ProtocolParameters;
