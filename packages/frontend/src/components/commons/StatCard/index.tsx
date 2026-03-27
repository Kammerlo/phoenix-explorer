import { Box, Paper, Skeleton, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

interface StatCardProps {
  title: string;
  loading: boolean;
  children: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, loading, children }) => {
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        background: theme.palette.secondary[0],
        border: `1px solid ${theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e0e0e0"}`,
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: theme.palette.text.secondary, fontWeight: 600, letterSpacing: 1 }}
      >
        {title}
      </Typography>
      <Box mt={1}>
        {loading ? (
          <>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="50%" />
          </>
        ) : (
          children
        )}
      </Box>
    </Paper>
  );
};

export default StatCard;
