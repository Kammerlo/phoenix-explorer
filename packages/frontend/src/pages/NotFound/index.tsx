import { Container, styled, Typography } from "@mui/material";
import { useEffect } from "react";
import { Link } from "react-router-dom";

import { NotFoundIcon } from "src/commons/resources";
import { routers } from "src/commons/routers";

const NotFoundContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 96px 0px 120px;
  text-align: center;
  opacity: 0;
  animation: notFoundReveal 420ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  @keyframes notFoundReveal {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    opacity: 1;
    transform: none;
    animation: none;
  }
`;

const Image = styled("img")`
  width: 100%;
  max-width: 240px;
  margin-bottom: 1.75rem;
  user-select: none;
  pointer-events: none;
  filter: drop-shadow(0 6px 24px rgba(0, 0, 0, 0.06));
`;

const Title = styled(Typography)`
  color: ${(props) => props.theme.palette.secondary.main};
  font-weight: 700;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled(Typography)`
  color: ${(props) => props.theme.palette.secondary.light};
  margin-bottom: 2rem;
  max-width: 420px;
`;

const BackToHome = styled(Link)`
  display: inline-block;
  padding: 10px 24px;
  border: 2px solid ${(props) => props.theme.palette.primary.main};
  border-radius: 999px;
  color: ${(props) => props.theme.palette.primary.main};
  font-weight: var(--font-weight-bold);
  text-decoration: none;
  transition: background-color 180ms cubic-bezier(0.16, 1, 0.3, 1),
    color 180ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
  &:link,
  &:visited {
    color: ${(props) => props.theme.palette.primary.main};
  }
  &:hover {
    background-color: ${(props) => props.theme.palette.primary.main};
    color: #fff !important;
    transform: translateY(-1px);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

const NotFound = () => {
  useEffect(() => {
    document.title = `Page Not Found | Cardano Blockchain Explorer`;
  }, []);

  return (
    <NotFoundContainer>
      <Image src={NotFoundIcon} alt="" />
      <Title variant="h3">This page is off the chain</Title>
      <Subtitle variant="body1">
        The link you followed may be broken, or the data this page expects isn&apos;t available with the current
        provider. Head back home and try a search instead.
      </Subtitle>
      <BackToHome to={routers.HOME}>Back to home</BackToHome>
    </NotFoundContainer>
  );
};
export default NotFound;
