/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";
import { resolve } from "path";

// Root .env lives two levels up (monorepo root)
const rootDir = resolve(__dirname, "../../");

// @ts-ignore
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "REACT_");
  return {
    define: {
      global: "globalThis",
      "process.env.REACT_APP_API_TYPE": JSON.stringify(env.REACT_APP_API_TYPE),
      "process.env.REACT_APP_API_URL": JSON.stringify(env.REACT_APP_API_URL),
      "process.env.REACT_APP_NETWORK": JSON.stringify(env.REACT_APP_NETWORK),
      "process.env.REACT_APP_ADA_HANDLE_API": JSON.stringify(env.REACT_APP_ADA_HANDLE_API),
      "process.env.REACT_APP_API_URL_COIN_GECKO": JSON.stringify(env.REACT_APP_API_URL_COIN_GECKO)
    },
    envDir: rootDir,
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
      open: true,
      // Same-origin proxy to a local Yaci Store so the browser never makes a
      // cross-origin request → zero CORS when developing against a Yaci DevKit.
      // Point the YACI provider at "/local-yaci/api/v1" (relative). Override the
      // upstream with REACT_APP_YACI_PROXY_TARGET for non-default ports/hosts.
      proxy: {
        "/local-yaci": {
          target: env.REACT_APP_YACI_PROXY_TARGET || "http://localhost:8080",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/local-yaci/, "")
        }
      }
    },
    build: {
      outDir: "build",
      target: "esnext"
    }
  };
});
