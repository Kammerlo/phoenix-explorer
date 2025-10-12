import {
  Accordion,
  AccordionDetails,
  Box,
  Button,
  styled
} from "@mui/material";

export const AccordionContainer = styled(Accordion)(({ theme }) => ({
  boxShadow: "none",
  textAlign: "left",
  width: "100%",
  margin: 0,
  backgroundColor: theme.palette.secondary[0]
}));

export const FilterWrapper = styled(Box)`
  background: ${({ theme }) => theme.palette.secondary[0]};
  position: relative;
  display: inline-flex;
  border-radius: 5px;
`;

export const FilterContainer = styled(Box)(({ theme }) => ({
  width: 300,
  backgroundColor: theme.palette.secondary[0],
  zIndex: 15,
  position: "absolute",
  top: "calc(100% + 10px)",
  right: 0,
  borderRadius: theme.spacing(1),
  boxShadow: "2px 2px 10px 0px #43465633",
  [theme.breakpoints.down("sm")]: {
    width: 250,
    right: -60
  }
}));

export const AccordionDetailsFilter = styled(AccordionDetails)(({ theme }) => ({
  padding: `0 ${theme.spacing(1)} !important`,
  backgroundColor: theme.palette.primary[100],
  borderRadius: theme.spacing(1),
  color: theme.palette.secondary.light
}));

export const ApplyFilterButton = styled(Button)(({ theme }) => ({
  width: "100%",
  textTransform: "capitalize",
  fontWeight: "bold",
  fontSize: 16,
  color: theme.isDark ? theme.palette.secondary[100] : theme.palette.primary[100],
  background: theme.palette.primary.main,
  ":hover": {
    background: theme.palette.primary.dark
  },
  ":disabled": {
    color: theme.palette.secondary[600],
    background: theme.palette.primary[200]
  }
}));

export const ButtonSort = styled(Button)(({ theme }) => ({
  textTransform: "capitalize",
  color: theme.palette.secondary.main,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between"
}));
