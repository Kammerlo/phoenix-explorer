import { Box, Breadcrumbs, CircularProgress, Link, Typography } from "@mui/material";
import React from "react";
import { Link as RouterLink } from "react-router-dom";

import ErrorBoundary from "../ErrorBoundary";

interface Crumb {
  label: string;
  href?: string;
}

interface PageShellProps {
  title?: string;
  breadcrumbs?: Crumb[];
  loading?: boolean;
  children: React.ReactNode;
}

const PageShell: React.FC<PageShellProps> = ({ title, breadcrumbs, loading, children }) => {
  return (
    <Box
      component="main"
      role="main"
      sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: "auto" }}
    >
      {(breadcrumbs || title) && (
        <Box mb={2}>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
              {breadcrumbs.map((crumb, i) =>
                crumb.href && i < breadcrumbs.length - 1 ? (
                  <Link
                    key={i}
                    component={RouterLink}
                    to={crumb.href}
                    underline="hover"
                    color="text.secondary"
                    variant="body2"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <Typography key={i} variant="body2" color="text.primary">
                    {crumb.label}
                  </Typography>
                )
              )}
            </Breadcrumbs>
          )}
          {title && (
            <Typography variant="h5" component="h1" fontWeight={700}>
              {title}
            </Typography>
          )}
        </Box>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress />
        </Box>
      ) : (
        <ErrorBoundary>{children}</ErrorBoundary>
      )}
    </Box>
  );
};

export default PageShell;
