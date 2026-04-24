import { Box, Skeleton, SkeletonProps, Stack } from "@mui/material";

export interface LoadingWrapperProps {
  loading: boolean;
  children: React.ReactNode;
  skeletonCount?: number;
  skeletonVariant?: SkeletonProps["variant"];
  skeletonHeight?: SkeletonProps["height"];
  skeletonWidth?: SkeletonProps["width"];
  skeletonSpacing?: number;
  skeletonProps?: Omit<SkeletonProps, "variant" | "height" | "width">;
  fallback?: React.ReactNode;
}

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  loading,
  children,
  skeletonCount = 1,
  skeletonVariant = "rectangular",
  skeletonHeight = 24,
  skeletonWidth = "100%",
  skeletonSpacing = 1,
  skeletonProps,
  fallback
}) => {
  if (!loading) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  if (skeletonCount <= 1) {
    return (
      <Skeleton
        variant={skeletonVariant}
        height={skeletonHeight}
        width={skeletonWidth}
        {...skeletonProps}
      />
    );
  }

  return (
    <Stack spacing={skeletonSpacing}>
      {Array.from({ length: skeletonCount }).map((_, idx) => (
        <Box key={idx}>
          <Skeleton
            variant={skeletonVariant}
            height={skeletonHeight}
            width={skeletonWidth}
            {...skeletonProps}
          />
        </Box>
      ))}
    </Stack>
  );
};

export default LoadingWrapper;
