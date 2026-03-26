import { formatDistanceToNow, fromUnixTime } from "date-fns";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  time?: number;
};

const FormNowMessage = ({ time }: Props) => {
  const { t } = useTranslation();
  // Handle both Unix seconds (from backend: ~1.7B) and milliseconds (from Date.now(): ~1.7T)
  const getFromNow = (ts: number) =>
    formatDistanceToNow(ts > 1e10 ? new Date(ts) : fromUnixTime(ts), { addSuffix: true });
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
