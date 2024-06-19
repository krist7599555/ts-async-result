import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    minify: false,
    lib: {
      formats: ["es"],
      entry: [
        resolve(__dirname, "src/async-result.ts"),
      ],
    },
  },
  plugins:[
    dts({
      exclude: ['src/*.test.ts']
    }),
  ]
});