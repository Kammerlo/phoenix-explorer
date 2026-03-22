import { Alert, Snackbar, Stack } from "@mui/material";
import React from "react";
import { useSelector } from "react-redux";

import { removeToast } from "src/stores/toast";
import { RootState } from "src/stores/types";

const ToastNotifications: React.FC = () => {
  const toasts = useSelector((state: RootState) => state.toast.toasts);

  return (
    <Stack
      spacing={1}
      sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}
    >
      {toasts.map((toast) => (
        <Snackbar
          key={toast.id}
          open
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          sx={{ position: "relative", bottom: "unset", right: "unset" }}
        >
          <Alert
            severity={toast.type}
            onClose={() => removeToast(toast.id)}
            variant="filled"
            sx={{ minWidth: 280 }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
};

export default ToastNotifications;
