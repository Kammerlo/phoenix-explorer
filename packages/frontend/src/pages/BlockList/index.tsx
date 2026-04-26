import React, { useEffect, useState } from "react";
import { Box, Container, Typography } from "@mui/material";

import BlockListComponent from "../../components/BlockListComponent";
import { Block } from "@shared/dtos/block.dto";
import { ApiReturnType } from "@shared/APIReturnType";
import { ApiConnector } from "src/commons/connector/ApiConnector";

const BlockList: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [fetchData, setFetchData] = useState<ApiReturnType<Block[]>>();
  const apiConnector = ApiConnector.getApiConnector();

  function updateData(pageInfo: { page: number; size?: number }) {
    setLoading(true);
    apiConnector.getBlocksPage(pageInfo).then((data: ApiReturnType<Block[]>) => {
      setFetchData(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    document.title = "Latest Blocks | Phoenix Explorer";
    updateData({ page: 1, size: 10 });
  }, []);

  return (
    <Container sx={{ pt: 3, pb: 6 }}>
      <Box mb={2}>
        <Typography variant="h5" fontWeight={700} component="h1">Latest Blocks</Typography>
      </Box>
      <BlockListComponent fetchData={fetchData} updateData={updateData} loading={loading} />
    </Container>
  );
};

export default BlockList;
