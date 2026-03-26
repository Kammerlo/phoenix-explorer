import { useEffect } from "react";
import { Box, Typography } from "@mui/material";

import PoolList from "src/components/PoolList";

import { StyledContainer } from "./styles";

const PoolListPage = () => {
  useEffect(() => {
    document.title = `Pools | Cardano Blockchain Explorer`;
  }, []);

  return (
    <StyledContainer>
      <Box mb={2} px={2}>
        <Typography variant="h5" fontWeight={700} component="h1">Stake Pools</Typography>
      </Box>
      <PoolList />
    </StyledContainer>
  );
};

export default PoolListPage;
