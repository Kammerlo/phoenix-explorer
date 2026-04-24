import { Box, BoxProps, Tooltip } from "@mui/material";

import { formatADA, formatADAFull } from "src/commons/utils/helper";

export interface AdaAmountProps extends Omit<BoxProps, "children"> {
  value?: string | number | null;
  variant?: "short" | "full";
  showTooltip?: boolean;
  suffix?: React.ReactNode;
  zeroFallback?: React.ReactNode;
}

const AdaAmount: React.FC<AdaAmountProps> = ({
  value,
  variant = "short",
  showTooltip = true,
  suffix,
  zeroFallback = "0",
  ...rest
}) => {
  if (value === null || value === undefined || value === "") {
    return <Box component="span" {...rest}>{zeroFallback}</Box>;
  }

  const display = variant === "full" ? formatADAFull(value) : formatADA(value);
  const fullText = formatADAFull(value);

  const content = (
    <Box component="span" {...rest}>
      {display}
      {suffix}
    </Box>
  );

  if (variant === "short" && showTooltip && display !== fullText) {
    return (
      <Tooltip title={fullText} placement="top" arrow>
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default AdaAmount;
