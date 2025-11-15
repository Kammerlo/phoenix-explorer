import { useEffect } from "react";
import { Container, styled, Box, Typography, Link, Alert, AlertTitle } from "@mui/material";
import { useTranslation } from "react-i18next";

import LatestStories from "src/components/Home/LatestStories";
import LatestTransactions from "src/components/Home/LatestTransactions";
import HomeStatistic from "src/components/Home/Statistic";
import TopDelegationPools from "src/components/Home/TopDelegationPools";
import HomeTrending from "src/components/Home/Trending";

const HomeContainer = styled(Container)`
  padding-top: 30px;
  padding-bottom: 40px;
`;

const DisclaimerBox = styled(Alert)(({ theme }) => ({
  marginBottom: '32px',
  padding: '24px',
  borderRadius: '12px',
  backgroundColor: theme.palette.secondary[0],
  border: `1px solid ${theme.palette.primary[200]}`,
  '& .MuiAlert-icon': {
    color: theme.palette.primary.main
  }
}));

const DisclaimerTitle = styled(AlertTitle)(({ theme }) => ({
  color: theme.palette.secondary.main,
  fontWeight: 'bold',
  fontSize: '1.2rem',
  marginBottom: '16px'
}));

const DisclaimerText = styled(Typography)(({ theme }) => ({
  color: theme.palette.secondary.light,
  lineHeight: 1.6,
  marginBottom: '12px',
  '&:last-child': {
    marginBottom: 0
  }
}));

const StyledLink = styled(Link)(({ theme }) => ({
  color: theme.palette.primary.main,
  textDecoration: 'none',
  fontWeight: 'bold',
  '&:hover': {
    textDecoration: 'underline'
  }
}));

const Home = () => {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = t("head.page.dashboard");
  }, [t]);

  return (
    <HomeContainer data-testid="home-container">
      <DisclaimerBox severity="info">
        <DisclaimerTitle>
          🚧 Community Project - Development Continues 🚧
        </DisclaimerTitle>
        <DisclaimerText>
          I'm still committed to pushing this project forward, but <strong>progress will be slower than anticipated</strong> due to the lack of funding. 
          Unfortunately, my application to{' '}
          <StyledLink href="https://projectcatalyst.io/funds/14/cardano-open-developers/phoenix-explorer-reviving-an-open-source-explorer" target="_blank">
            Project Catalyst Fund 14
          </StyledLink>{' '}
          was not successful, which means development will continue at a reduced pace as this remains a volunteer effort.
        </DisclaimerText>
        <DisclaimerText>
          Despite these constraints, my goal remains the same: to build this explorer <strong>for the community and as open source</strong> so it can be reused by everyone. 
          It's unfortunate that this valuable piece of software was about to be discontinued, which is why I decided to pick it up and continue its development.
        </DisclaimerText>
        <DisclaimerText>
          There's still a lot of work to do, and you may encounter bugs along the way. Development will progress as time permits. You can follow the current progress and contribute on{' '}
          <StyledLink href="https://github.com/Kammerlo/phoenix-explorer" target="_blank">
            GitHub
          </StyledLink>{' '}
          where the project is actively maintained. Any contributions, whether code, feedback, or support, are greatly appreciated!
        </DisclaimerText>
        <DisclaimerText>
          <strong>Thank you for your patience and continued support! 🙏</strong>
        </DisclaimerText>
      </DisclaimerBox>
    </HomeContainer>
  );
};

export default Home;
