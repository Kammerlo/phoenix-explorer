import { Box, Chip, Tooltip } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

import { HeaderSearchIconComponent } from "src/commons/resources";
import CustomIcon from "src/components/commons/CustomIcon";

import { Form, StyledInput, SubmitButton } from "./style";

interface Props {
  home: boolean;
  callback?: () => void;
  setShowErrorMobile?: (show: boolean) => void;
}

interface DetectedType {
  label: string;
  path: string;
}

function detectEntityType(input: string): DetectedType | null {
  const v = input.trim();
  if (!v) return null;
  if (/^pool1[a-z0-9]{50,}$/.test(v)) return { label: "Pool", path: "/pool/" };
  if (/^drep1[a-z0-9]+$/.test(v)) return { label: "DRep", path: "/drep/" };
  if (/^(addr1|stake1)[a-z0-9]+$/.test(v)) return { label: "Address", path: "/address/" };
  if (/^asset1[a-z0-9]+$/.test(v)) return { label: "Token", path: "/token/" };
  if (/^[0-9a-f]{64}$/i.test(v)) return { label: "Transaction", path: "/transaction/" };
  if (/^[0-9a-f]{56}$/i.test(v)) return { label: "Block/Policy", path: "/block/" };
  if (/^\d+$/.test(v)) return { label: "Block / Epoch", path: "/block/" };
  return null;
}

const HeaderSearch: React.FC<Props> = ({ home, callback }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");

  const detected = detectEntityType(searchValue);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const v = searchValue.trim();
    if (!v) return;
    const type = detectEntityType(v);
    if (type) {
      navigate(`${type.path}${v}`);
    } else {
      // fallback: try as transaction hash
      navigate(`/transaction/${v}`);
    }
    callback?.();
    setSearchValue("");
  }

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <Form home={+home} data-testid="header-search" onSubmit={submit}>
        <StyledInput
          data-testid="search-bar"
          home={home ? 1 : 0}
          required
          type="search"
          spellCheck={false}
          disableUnderline
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={t("common.search.placeholder", "Search transactions, blocks, addresses, pools…")}
        />
        <SubmitButton type="submit" home={home ? 1 : 0}>
          <CustomIcon
            icon={HeaderSearchIconComponent}
            stroke={theme.palette.secondary.light}
            fill={theme.palette.secondary[0]}
            height={home ? 24 : 20}
            width={home ? 24 : 20}
          />
        </SubmitButton>
      </Form>
      {detected && searchValue.length > 3 && (
        <Box sx={{ mt: 0.5, display: "flex", justifyContent: "flex-end", px: 1 }}>
          <Tooltip title={`Will search as ${detected.label}`}>
            <Chip
              label={detected.label}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: "0.65rem", height: 18, cursor: "default" }}
            />
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default HeaderSearch;
