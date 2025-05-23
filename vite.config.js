import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";
import path from "path";

export default defineConfig({
  root: resolve(__dirname, "src"),
  publicDir: resolve(__dirname, "src", "public"), // Ensure assets like images and manifest are in the public folder
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src", "index.html"), // Make sure Vite uses the correct entry HTML file
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  base: "/Distory-Dicoding/", // Set base to GitHub repo name for deployment
  plugins: [
    {
      name: "copy-service-worker",
      writeBundle() {
        const srcSwPath = resolve(__dirname, "src", "scripts", "sw.js");
        const destSwPath = resolve(__dirname, "dist", "sw.js");

        if (fs.existsSync(srcSwPath)) {
          const swDir = path.dirname(destSwPath);
          if (!fs.existsSync(swDir)) {
            fs.mkdirSync(swDir, { recursive: true });
          }
          fs.copyFileSync(srcSwPath, destSwPath);
          console.log("Service worker copied to build output directory");
        }
      },
    },
  ],
});
