import { Box, Skeleton, SkeletonProps, Stack } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";

import { DURATION, EASE } from "src/commons/animation";

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

const transition = { duration: DURATION.fast, ease: EASE.out };

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
  const renderSkeletons = () => {
    if (fallback) return fallback;
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

  return (
    <AnimatePresence mode="wait" initial={false}>
      {loading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
        >
          {renderSkeletons()}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingWrapper;
