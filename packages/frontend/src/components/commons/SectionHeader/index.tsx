import { Box, Typography, useTheme } from "@mui/material";
import { Link } from "react-router-dom";

interface SectionHeaderProps {
  title: string;
  viewAllPath: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, viewAllPath }) => {
  const theme = useTheme();
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
      <Typography variant="h6" fontWeight={600} color={theme.palette.text.primary}>
        {title}
      </Typography>
      <Link to={viewAllPath} style={{ textDecoration: "none" }}>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.primary.main, fontWeight: 500, "&:hover": { textDecoration: "underline" } }}
        >
          View All
        </Typography>
      </Link>
    </Box>
  );
};

export default SectionHeader;
