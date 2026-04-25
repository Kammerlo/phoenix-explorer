import styled from "@emotion/styled";

export const BoxRaised = styled.div`
  background: ${(props) => props.theme.palette.secondary[0]};
  box-shadow: ${(props) => props.theme.shadow.card};
  padding: 20px;
  border-radius: 12px;
  transition: box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
