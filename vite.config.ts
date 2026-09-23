import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Сборка рассчитана на встраивание в Django-шаблон:
 * фиксированные имена файлов без хэшей, кэш сбрасывается через ?v= в шаблоне.
 */
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_API_TARGET || "https://alterlit.ru";

  // Только для локальной разработки: подставляет сессионную куку в проксируемые
  // запросы, чтобы не логиниться через localhost. Значение берётся из .env.local,
  // который не попадает в репозиторий.
  const devCookie = env.VITE_DEV_COOKIE;

  return {
    plugins: [react()],
    // В проде статика лежит под /assets/books/dashboard/, в dev — от корня,
    // иначе локальный адрес превращался бы в тот же длинный путь.
    base: command === "build" ? env.VITE_STATIC_BASE || "/assets/books/dashboard/" : "/",
    build: {
      outDir: "dist",
      cssCodeSplit: false,
      // Один бандл: Django-шаблон подключает ровно два файла, без manifest.
      codeSplitting: false,
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          entryFileNames: "dashboard.js",
          assetFileNames: (info) => {
            const name = info.names?.[0] ?? "";
            return name.endsWith(".css") ? "dashboard.css" : "assets/[name][extname]";
          },
        },
      },
    },
    server: {
      // Слушаем на всех интерфейсах, чтобы dev-сервер был виден с других машин.
      host: true,
      port: 5180,
      strictPort: true,
      // Панель открывают по IP или внутреннему доменному имени — не режем по Host.
      allowedHosts: true,
      proxy: {
        "/api": {
          target: backend,
          changeOrigin: true,
          secure: true,
          cookieDomainRewrite: "",
          configure: (proxy) => {
            if (!devCookie) return;
            // Django на HTTPS сверяет Referer с доменом, а из dev он пришёл бы
            // с localhost и CSRF-проверка упала бы. Токен тоже подставляем сами:
            // куки csrftoken у localhost нет, браузер её прочитать не может.
            const csrf = /(?:^|;\s*)csrftoken=([^;]*)/.exec(devCookie)?.[1];
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("Cookie", devCookie);
              proxyReq.setHeader("Referer", `${backend}/`);
              proxyReq.setHeader("Origin", backend);
              if (csrf) proxyReq.setHeader("X-CSRFToken", csrf);
            });
          },
        },
        "/media": { target: backend, changeOrigin: true, secure: true },
      },
    },
  };
});
