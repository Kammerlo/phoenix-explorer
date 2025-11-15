import { createSlice, PayloadAction, Store } from "@reduxjs/toolkit";

import breakpoints from "../themes/breakpoints";
import { EpochCurrentType } from "@shared/dtos/epoch.dto";

let systemStore: Store | undefined;

export const setStoreSystem = (store: Store) => {
  systemStore = store;
};

export interface SystemState {
  currentEpoch: EpochCurrentType | null;
  specialPath: string | null;
  sidebar: boolean;
  onDetailView: boolean;
  blockNo?: number;
  blockKey?: number | string;
}

const initialState: SystemState = {
  currentEpoch: null,
  specialPath: null,
  sidebar: window.innerWidth >= breakpoints.values.md,
  onDetailView: false
};

const store = createSlice({
  name: "storeSystem",
  initialState,
  reducers: {
    setSidebar: (state, action: PayloadAction<boolean>) => ({
      ...state,
      sidebar: action.payload
    }),
    setOnDetailView: (state, action: PayloadAction<boolean>) => ({
      ...state,
      onDetailView: action.payload
    })
  }
});

export const setSidebar = (sidebar: boolean) => {
  systemStore?.dispatch(store.actions.setSidebar(sidebar));
};

export const setOnDetailView = (onDetailView: boolean) => {
  systemStore?.dispatch(store.actions.setOnDetailView(onDetailView));
};

export default store.reducer;
