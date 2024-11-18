import { useEffect } from "react";

export const SystemLoader = () => {
  useEffect(() => {
    sessionStorage.setItem("timezone", window.navigator.language);
  }, []);

  return null;
};
