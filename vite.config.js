import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  base: "/VR-labs/",
  plugins: [glsl()],
});
