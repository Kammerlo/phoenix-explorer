import { formatDistanceToNow, fromUnixTime } from "date-fns";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  time?: number;
};

const FormNowMessage = ({ time }: Props) => {
  const { t } = useTranslation();
  const getFromNow = (ts: number) => formatDistanceToNow(fromUnixTime(ts), { addSuffix: true });
  const [message, setMessage] = useState(time ? `${t("common.lastUpdated")} ${getFromNow(time)}` : "");
  useEffect(() => {
    if (time) {
      setMessage(`${t("common.lastUpdated")} ${getFromNow(time)}`);
      const interval = setInterval(() => {
        setMessage(`${t("common.lastUpdated")} ${getFromNow(time)}`);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [time, t]);

  return <>{message}</>;
};

export default FormNowMessage;
