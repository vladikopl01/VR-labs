import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  server: { https: true },
  base: "/VR-labs/",
  plugins: [glsl(), mkcert()],
});
