import { Container, styled } from "@mui/material";

export const ContainerBox = styled(Container)`
  padding-top: 30px;
  display: flex;
  flex-direction: column;
  @media screen and (max-width: ${(props) => props.theme.breakpoints.values.md}px) {
    margin-top: -20px;
  }
  @media screen and (max-width: ${(props) => props.theme.breakpoints.values.sm}px) {
    margin-top: 0px !important;
  }
`;