import moment from "moment";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  time?: number;
};

const FormNowMessage = ({ time }: Props) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState(time ? `${t("common.lastUpdated")} ${moment.unix(time).fromNow()}` : "");
  useEffect(() => {
    if (time) {
      setMessage(`${t("common.lastUpdated")} ${moment.unix(time).fromNow()}`);
      const interval = setInterval(() => {
        setMessage(`${t("common.lastUpdated")} ${moment.unix(time).fromNow()}`);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [time, t]);

  return <>{message}</>;
};

export default FormNowMessage;
