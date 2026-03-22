import { useNavigate, useLocation } from "react-router-dom";
import { stringify } from "qs";
import { pick } from "lodash";

import { getPageInfo } from "../utils/helper";

const usePageInfo = () => {
  const { search } = useLocation();
  const navigate = useNavigate();

  const pageInfo = getPageInfo(search);

  const setSort = (sort: string) => {
    if (sort === "") {
      navigate({ search: stringify({ ...pick(pageInfo, ["page", "size", "retired", "tokenName"]), page: 1 }) }, { replace: true });
    } else {
      navigate({ search: stringify({ ...pageInfo, page: 1, sort }) }, { replace: true });
    }
  };

  return { pageInfo, setSort };
};

export default usePageInfo;
