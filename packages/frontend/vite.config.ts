/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";
import { resolve } from "path";

// @ts-ignore
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "REACT_");
  return {
    define: {
      global: "globalThis",
      "process.env.REACT_APP_API_TYPE": JSON.stringify(env.REACT_APP_API_TYPE),
      "process.env.REACT_APP_API_URL": JSON.stringify(env.REACT_APP_API_URL),
      "process.env.REACT_APP_NETWORK": JSON.stringify(env.REACT_APP_NETWORK),
      "process.env.REACT_APP_ADA_HANDLE_API": JSON.stringify(env.REACT_APP_ADA_HANDLE_API),
      "process.env.REACT_APP_API_URL_COIN_GECKO": JSON.stringify(env.REACT_APP_API_URL_COIN_GECKO)
    },
    base: "/",
    optimizeDeps: {
      exclude: ["util"]
    },
    // base: "/en/",
    resolve: {
      alias: {
        "src/": resolve(__dirname, "./src/$1")
      }
    },
    plugins: [
      react({
        jsxImportSource: "@emotion/react",
        babel: {
          plugins: ["@emotion/babel-plugin"]
        }
      }),
      viteTsconfigPaths(),
      svgr({
        svgrOptions: {
          ref: true
        },
        include: "**/*.svg?react"
      })
    ],
    server: {
      open: true
    },
    build: {
      outDir: "build",
      target: "esnext"
    }
  };
});
