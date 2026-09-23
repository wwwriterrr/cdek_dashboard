# Alterlit Dashboard

Панель управления предзаказами книг издательства Alterlit.
Таблица заказов для администраторов: статусы, оплата, доставка СДЭК.

Техническое задание и контракты бэкенда — в [SPEC.md](SPEC.md).

## Стек

React 19 + TypeScript (strict), Vite 8, Redux Toolkit с RTK Query.
UI-библиотек нет: таблица плотная и специфичная, готовые компоненты
пришлось бы переопределять целиком.

## Разработка

```bash
npm install
cp .env.example .env.local   # заполните под себя
npm run dev
```

`vite dev` проксирует `/api` и `/media` на боевой бэкенд, чтобы не поднимать
Django локально. Сессионную куку и CSRF-токен для проксируемых запросов
подставляет сам прокси — см. `VITE_DEV_COOKIE` в `.env.example`.

**Не коммитьте `.env.local`**: там рабочая сессия администратора.

## Сборка

```bash
npm run build      # tsc -b && vite build
npm run typecheck
```

На выходе — `dist/dashboard.js` и `dist/dashboard.css` с фиксированными именами
без хэшей. Статика отдаётся с `/assets/books/dashboard/`, страница собирается
Django-шаблоном: пример подключения и команды деплоя в
[django_template_example.html](django_template_example.html).
