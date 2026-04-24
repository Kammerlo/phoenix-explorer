import { Stack, StackProps } from "@mui/material";
import { Breakpoint } from "@mui/material/styles";

export interface ResponsiveStackProps extends Omit<StackProps, "direction"> {
  columnAt?: Breakpoint;
  rowDirection?: "row" | "row-reverse";
  columnDirection?: "column" | "column-reverse";
}

const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  columnAt = "md",
  rowDirection = "row",
  columnDirection = "column",
  ...rest
}) => {
  return (
    <Stack
      {...rest}
      direction={{ xs: columnDirection, [columnAt]: rowDirection }}
    />
  );
};

export default ResponsiveStack;
