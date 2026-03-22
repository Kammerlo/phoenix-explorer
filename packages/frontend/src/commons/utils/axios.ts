import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "";

export const defaultAxios = axios.create({
  baseURL: API_URL
});

// Auth axios is kept for compatibility; uses same base URL
export const authAxios = axios.create({
  baseURL: API_URL
});
