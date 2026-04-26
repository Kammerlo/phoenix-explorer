import { useEffect } from "react";
import { Box, Typography } from "@mui/material";

import DrepsList from "src/components/Dreps/DrepsList";

import { StyledContainer } from "./styles";

const Dreps = () => {
  useEffect(() => {
    document.title = `Delegated Representatives | Phoenix Explorer`;
  }, []);

  return (
    <StyledContainer>
      <Box mt={3} mb={1}>
        <Typography variant="h5" fontWeight={700} component="h1">
          Delegated Representatives
        </Typography>
        <Typography variant="body2" color="secondary.light" mt={0.5}>
          Registered DReps participating in Cardano on-chain governance
        </Typography>
      </Box>
      <DrepsList />
    </StyledContainer>
  );
};

export default Dreps;
