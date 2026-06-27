import React, { memo, useMemo } from "react";
import { useTheme } from "@emotion/react";

import { CloseSquareIcon, MinusSquareIcon, PlusSquareIcon } from "src/commons/resources";
import { UPLCData, UPLCProgram } from "src/types/uplc";
import NotAvailable from "src/components/commons/NotAvailable";

import { StyledTreeItem, TreeContainer } from "./styles";

export interface UPLCTreeProps {
  uplc: UPLCProgram;
}

// Render children recursively. Item ids are derived from the tree path so they
// are always unique (a hard requirement of @mui/x-tree-view v8's `itemId`),
// regardless of whether the decoder's node ids repeat.
const renderItems = (nodes: UPLCData[] | undefined, parentId: string): React.ReactNode =>
  (nodes || []).map((node, idx) => {
    const id = `${parentId}.${idx}`;
    return (
      <StyledTreeItem key={id} itemId={id} label={node?.text ?? ""}>
        {renderItems(node?.data, id)}
      </StyledTreeItem>
    );
  });

export const UPLCTree: React.FC<UPLCTreeProps> = ({ uplc }) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };

  const label = useMemo(
    () => (uplc.version.major ? `program ${uplc.version.major}.${uplc.version.minor}.${uplc.version.patch}` : ""),
    [uplc]
  );

  // Expand the root and its immediate children by default.
  const defaultExpandedItems = useMemo(() => {
    const ids = ["root"];
    (uplc.program?.data || []).forEach((_, idx) => ids.push(`root.${idx}`));
    return ids;
  }, [uplc]);

  if (!uplc.version.major) {
    return <NotAvailable />;
  }

  const iconFill = theme.isDark ? theme.palette.secondary.light : "none";
  const slots = {
    collapseIcon: () => <MinusSquareIcon fill={iconFill} />,
    expandIcon: () => <PlusSquareIcon fill={iconFill} />,
    endIcon: () => <CloseSquareIcon fill={iconFill} />
  };

  return (
    <TreeContainer slots={slots} defaultExpandedItems={defaultExpandedItems}>
      <StyledTreeItem itemId="root" label={label}>
        {renderItems(uplc.program?.data, "root")}
      </StyledTreeItem>
    </TreeContainer>
  );
};

export default memo(UPLCTree);
