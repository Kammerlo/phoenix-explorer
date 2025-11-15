import { Box, styled, useTheme } from "@mui/material";
import { FunctionComponent, SVGProps } from "react";
import CustomTooltip from "src/components/commons/CustomTooltip";
import { LockedTimelock, OpenTimeLock, SigNative } from "src/commons/resources";

const Chip = styled(Box)(({ theme }) => {
  return {
    padding: theme.spacing(0.5, 1),
    border: `1px solid ${theme.palette.primary.main}`,
    background: theme.isDark ? theme.palette.secondary[700] : theme.palette.primary[200],
    borderRadius: theme.spacing(2),
    marginRight: theme.spacing(0.5),
    fontSize: 12,
    maxWidth: "120px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontWeight: 600,
    textWrap: "nowrap"
  };
});

export const ChipContainer: React.FC<{
  Icon?: string | FunctionComponent<SVGProps<SVGSVGElement>>;
  message?: string | JSX.Element;
  titleTooltip?: string;
  variant?: "success" | "warning" | "info" | "error" | "gray";
  messageColor?: string;
  maxWidth?: string;
}> = ({ Icon, message, variant, titleTooltip, messageColor, maxWidth }) => {
  const theme = useTheme();

  const color = (variant?: "success" | "warning" | "info" | "error" | "gray") => {
    switch (variant) {
      case "success":
        return theme.palette.success[700];
      case "info":
        return theme.isDark ? theme.palette.primary[500] : theme.palette.primary.main;
      case "warning":
        return theme.palette.warning[700];
      case "error":
        return theme.palette.error[700];
      case "gray":
        return theme.palette.secondary[600];
      default:
        return theme.palette.success[700];
    }
  };

  const backgroundColor = (variant?: "success" | "warning" | "info" | "error" | "gray") => {
    switch (variant) {
      case "success":
        return theme.palette.success[100];
      case "info":
        return theme.palette.primary[200];
      case "warning":
        return theme.palette.warning[100];
      case "error":
        return theme.palette.error[100];
      case "gray":
        return theme.isDark ? theme.palette.secondary[100] : theme.palette.primary[100];
      default:
        return theme.palette.success[100];
    }
  };

  return (
    <CustomTooltip title={titleTooltip || ""}>
      <Chip
        pl={`${Icon ? "4px" : 1} !important`}
        maxWidth={maxWidth ? `${maxWidth} !important` : "unset"}
        mb={1}
        bgcolor={`${backgroundColor(variant)} !important`}
        borderColor={`${color(variant)} !important`}
      >
        <Box display={"flex"} alignItems={"center"} height={"100%"}>
          {Icon && (
            <Box
              height={23}
              mr={1}
              width={23}
              borderRadius={"50%"}
              bgcolor={`${color(variant)} !important`}
              display={"flex"}
              alignItems={"center"}
              justifyContent={"center"}
            >
              <Icon />
            </Box>
          )}
          <Box
            overflow={"hidden"}
            textOverflow={"ellipsis"}
            color={({ palette }) => messageColor || palette.secondary.light}
            sx={{
              textWrap: "nowrap"
            }}
          >
            {message}
          </Box>
        </Box>
      </Chip>
    </CustomTooltip>
  );
};

export const TimeLockChip: React.FC<{ isOpen: boolean | null }> = ({ isOpen }) => {
  if (isOpen) {
    return <ChipContainer Icon={OpenTimeLock} message="Open" variant="success" />;
  }
  return <ChipContainer Icon={LockedTimelock} message="Locked" variant="warning" />;
};

export const MultiSigChip: React.FC<{ isMultiSig: boolean }> = ({ isMultiSig }) => {
  if (isMultiSig) {
    return <ChipContainer Icon={SigNative} message="Multi-Sig" variant="info" />;
  }
  return <ChipContainer Icon={SigNative} message="Single-Sig" variant="info" />;
};
