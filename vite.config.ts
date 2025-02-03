import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true, // Ensure TypeScript types are correctly generated
    }),
  ],
  build: {
    minify: false,
    lib: {
      entry: "./src/index.ts",
      formats: ["es"],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      output: {
        preserveModules: false, // Disable preserveModules to avoid relative path issues
      },
      external: [
        "react",
        "react/jsx-runtime",
        "react-dom",
        "react-dom/client",
        "react-rnd",
        "pdfjs-dist",
        "pdfjs-dist/web/pdf_viewer", // Correct path for pdfjs-dist
        "ts-debounce", // Correct dependency name
      ],
    },
  },
});