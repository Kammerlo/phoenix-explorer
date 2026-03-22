import { useDispatch, useSelector } from "react-redux";
import store from "./index";

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <TSelected>(selector: (state: RootState) => TSelected) =>
  useSelector(selector);

export * from "react-redux";
