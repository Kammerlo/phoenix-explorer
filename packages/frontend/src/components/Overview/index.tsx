import { Box, Grid, Paper, Skeleton, Typography, useTheme } from "@mui/material";
import { MdHowToVote, MdAccountBalance, MdPeople } from "react-icons/md";
import { IoShieldCheckmark } from "react-icons/io5";

import TabOverview from "./TabOverview";

export default function OverviewComponent() {
  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h5" fontWeight={700} component="h1" gutterBottom>
          Governance Actions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          On-chain governance proposals submitted to the Cardano blockchain. DReps, SPOs, and the Constitutional
          Committee vote on these actions to shape the protocol's future.
        </Typography>
      </Box>
      <TabOverview />
    </Box>
  );
}
