import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import { App } from "./App";

const container = document.getElementById("alterlit-dashboard");

if (!container) {
  // Шаблон подключил скрипт, но забыл точку монтирования — скажем об этом вслух,
  // иначе страница окажется молча пустой.
  throw new Error(
    'Не найден контейнер #alterlit-dashboard. Добавьте <div id="alterlit-dashboard"></div> в шаблон.',
  );
}

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
