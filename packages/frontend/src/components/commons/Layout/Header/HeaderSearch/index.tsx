/* eslint-disable no-case-declarations */
import {
  Backdrop,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  SelectChangeEvent,
  useTheme
} from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { BiChevronDown } from "react-icons/bi";
import { RouteComponentProps, withRouter } from "react-router-dom";

import { HeaderSearchIconComponent } from "src/commons/resources";
import CustomIcon from "src/components/commons/CustomIcon";

import {
  Form,
  Option,
  SelectOption,
  StyledInput,
  StyledSelect,
  SubmitButton,
} from "./style";

interface Props extends RouteComponentProps {
  home: boolean;
  callback?: () => void;
  setShowErrorMobile?: (show: boolean) => void;
}

interface Option {
  value: string;
  label: string;
  path?: string;
  placeholder: string;
}

const options: Option[] = [
  // ToDo: Add a general search option
  {
    value: "transaction",
    label: "filter.transactions",
    path: "/transaction/",
    placeholder: "filter.placeholder.transaction"
  },
  {
    value: "epoch",
    label: "filter.epochs",
    path: "/epoch/",
    placeholder: "filter.placeholder.epoch"
  },
  {
    value: "block",
    label: "filter.blocks",
    path: "/block/",
    placeholder: "filter.placeholder.block"
  },
  {
    value: "token",
    label: "filter.tokens",
    path: "/token/",
    placeholder: "filter.placeholder.token"
  },
  {
    value: "address",
    label: "filter.addresses",
    path: "/address/",
    placeholder: "filter.placeholder.address"
  },
  {
    value: "pool",
    label: "filter.pools",
    path: "/pool/",
    placeholder: "filter.placeholder.pool"
  },
  {
    value: "drep",
    label: "filter.dreps",
    path: "/drep/",
    placeholder: "filter.placeholder.drep"
  }
];

enum SearchType {
  ALL = "all",
  EPOCHS = "epochs",
  BLOCKS = "blocks",
  TRANSACTIONS = "transactions",
  ADDRESS = "address",
}

interface SearchResult {
  value: String;
  type: SearchType;
}

const HeaderSearch: React.FC<Props> = ({ home, callback, setShowErrorMobile, history }) => {


  const { t } = useTranslation();
  const theme = useTheme();
  const [showOption, setShowOption] = useState(false);
  const [selectedOption, setSelectedOption] = useState(getPreSelectedOption());
  const [searchValue, setSearchValue] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  function getPreSelectedOption() {
    const found = options.filter(item => history.location.pathname.includes(item.value))
    if (found.length > 0) {
      return found[0];
    } else {
      return options[0];
    }
  }

  function submit() {
    if (selectedOption.path) {
      history.push(`${selectedOption.path}${searchValue}`);
    } else {

    }
  }

  return (
    <Box>
      <Form home={+home} data-testid="header-search">
        <Backdrop sx={{ backgroundColor: "unset" }} open={showOption} onClick={() => setShowOption(false)} />
        <StyledSelect
          data-testid="all-filters-dropdown"
          IconComponent={BiChevronDown}
          home={home ? 1 : 0}
          value={selectedOption.value}
          onChange={(e: SelectChangeEvent<string>) => {
            setSelectedOption(options.find(item => item.value === e.target.value) || options[0]);
          }}
          MenuProps={{
            MenuListProps: {
              sx: {
                bgcolor: ({ palette }) => `${palette.secondary[0]} !important`
              }
            },
            PaperProps: {
              sx: {
                bgcolor: ({ palette }) => `${palette.secondary[0]} !important`
              }
            }
          }}
        >
          {options.map((item, index) => (
            <SelectOption data-testid={"filter-options"} key={index} value={item.value} home={home ? 1 : 0}>
              {t(item.label)}
            </SelectOption>
          ))}
        </StyledSelect>
        <StyledInput
          data-testid="search-bar"
          home={home ? 1 : 0}
          required
          type="search"
          spellCheck={false}
          disableUnderline
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value)
          }}
          placeholder={t(selectedOption.placeholder)}
        />
        <SubmitButton type="submit" home={home ? 1 : 0} onClick={() => submit()}>
          <CustomIcon
            icon={HeaderSearchIconComponent}
            stroke={theme.palette.secondary.light}
            fill={theme.palette.secondary[0]}
            height={home ? 24 : 20}
            width={home ? 24 : 20}
          />
        </SubmitButton>
      </Form>
      {
        results.length > 0 && (
          <Paper elevation={3} sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 10,
            mt: 0.5,
            width: "fit-content",
            maxWidth: "100%",
            minWidth: "100%", // match select width
          }} >
            <List>
              {results.map((result, index) => (
                <ListItem key={index} divider>
                  <ListItemText primary={result.value} />
                </ListItem>
              ))}
            </List>
          </Paper>
        )
      }
    </Box>
  )
    ;
};

export default withRouter(HeaderSearch);

