import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { persistReducer, persistStore, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { PersistPartial } from "redux-persist/es/persistReducer";

import { ThemeStoreType } from "src/types/theme";

import systemReducer, { setStoreSystem, SystemState } from "./system";
import toastReducer, { setStoreToast, ToastState } from "./toast";
import themeReducer, { setStoreTheme } from "./theme";
import providerReducer, { setStoreProvider, ProviderState } from "./provider";

const themePersistConfig = {
  key: "theme",
  storage: storage,
  blacklist: ["isDark"]
};

const providerPersistConfig = {
  key: "provider",
  storage: storage
};

const rootReducer = combineReducers({
  system: systemReducer,
  toast: toastReducer,
  theme: persistReducer(themePersistConfig, themeReducer),
  provider: persistReducer(providerPersistConfig, providerReducer)
});

export type RootReducerState = {
  system: SystemState;
  toast: ToastState;
  theme: ThemeStoreType & PersistPartial;
  provider: ProviderState & PersistPartial;
};

const persistConfig = {
  key: "root",
  storage: storage,
  whitelist: []
};

const pReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: pReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
      }
    })
});

export const persistor = persistStore(store);

setStoreSystem(store);
setStoreToast(store);
setStoreTheme(store);
setStoreProvider(store);

export const getStore = () => store;

export default store;
