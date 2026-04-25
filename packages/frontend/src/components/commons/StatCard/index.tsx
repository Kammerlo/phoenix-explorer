import { Box, Paper, Skeleton, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { DURATION, EASE } from "src/commons/animation";

interface StatCardProps {
  title: string;
  loading: boolean;
  children: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, loading, children }) => {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const borderColor = theme.isDark
    ? alpha(theme.palette.secondary.light, 0.1)
    : theme.palette.primary[200] || "#e0e0e0";
  const accent = theme.palette.primary.main;

  return (
    <Paper
      component={motion.div}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: DURATION.fast, ease: EASE.out }}
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        background: theme.palette.secondary[0],
        border: `1px solid ${borderColor}`,
        position: "relative",
        overflow: "hidden",
        transition: `border-color ${DURATION.fast * 1000}ms ${theme.transitions.easing.easeOut}, box-shadow ${DURATION.fast * 1000}ms ${theme.transitions.easing.easeOut}`,
        "&:hover": {
          borderColor: alpha(accent, theme.isDark ? 0.45 : 0.35),
          boxShadow: `0 4px 18px ${alpha(accent, theme.isDark ? 0.18 : 0.1)}`
        }
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: theme.palette.text.secondary, fontWeight: 600, letterSpacing: 1 }}
      >
        {title}
      </Typography>
      <Box mt={1} sx={{ minHeight: 64 }}>
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.fast, ease: EASE.out }}
            >
              <Skeleton variant="text" width="60%" height={40} />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="50%" />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: reduce ? 0 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.base, ease: EASE.out }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Paper>
  );
};

export default StatCard;
