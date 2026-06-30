# PromoCode Manager

Fullstack приложение для управления промокодами с аналитикой, построенное на
**CQRS**-подходе: запись и чтение разнесены по разным хранилищам.

| Поток | Хранилище | Назначение |
| --- | --- | --- |
| **Command** (запись) | MongoDB | Источник истины. Все мутации (create/update/delete/redeem) |
| **Query** (чтение таблиц) | ClickHouse | Все таблицы фронтенда читаются отсюда |
| **Синхронизация** | — | После каждой мутации состояние реплицируется в ClickHouse |
| **Кэш** | Redis | Кэширование аналитической сводки, инвалидация при мутациях |

## Стек

- **Backend:** NestJS, TypeScript, Mongoose, `@clickhouse/client`, `@nestjs/cqrs`, ioredis
- **Frontend:** React + Vite, TypeScript, TanStack Query, TanStack Table, React Hook Form + Zod
- **Базы:** MongoDB, ClickHouse, Redis
- **Инфраструктура:** Docker Compose

UI выполнен в светлом стиле Telegram: минимальные скругления, без теней, лаконично.

## Быстрый старт (Docker)

```bash
docker compose up --build
```

После старта:

- Клиент: http://localhost:5173
- API: http://localhost:3000/api
- ClickHouse HTTP: http://localhost:8123

Засеять демо-данными (после того как сервер поднялся):

```bash
cd server
npm install
npm run seed            # по умолчанию http://localhost:3000/api
```

## Локальная разработка

Поднимите только инфраструктуру, а приложения запускайте локально:

```bash
docker compose up mongo clickhouse redis
```

Backend:

```bash
cd server
npm install
cp .env.example .env
npm run start:dev       # http://localhost:3000/api
```

Frontend:

```bash
cd client
npm install
npm run dev             # http://localhost:5173 (проксирует /api на :3000)
```

## Архитектура

### Backend — CQRS + слоистая (hexagonal-style) структура

```
server/src
├── config/                     # типизированная конфигурация
├── infrastructure/             # shared-инфраструктура
│   ├── clickhouse/             # клиент + bootstrap аналитической схемы
│   └── redis/                  # кэш-сервис
└── modules/promocodes
    ├── domain/                 # Mongoose-схема, типы, enum-ы
    ├── application/
    │   ├── commands/           # Command + Handler (пишут в Mongo, затем sync)
    │   ├── queries/            # Query + Handler (читают из ClickHouse)
    │   └── ports/              # интерфейсы репозиториев (write/read/sync)
    ├── infrastructure/         # реализации портов (Mongo, ClickHouse, Sync)
    └── presentation/           # контроллеры + DTO (валидация)
```

Поток команды:

1. Контроллер кладёт `Command` в `CommandBus`.
2. Handler пишет в MongoDB через `PromoCodeWriteRepository`.
3. Handler реплицирует результат в ClickHouse через `PromoCodeSyncPort`
   и инвалидирует кэш аналитики в Redis.

Поток запроса:

1. Контроллер кладёт `Query` в `QueryBus`.
2. Handler читает из ClickHouse через `PromoCodeReadRepository`
   (server-side пагинация, сортировка, фильтрация). Аналитика кэшируется в Redis.

ClickHouse использует `ReplacingMergeTree(version)` — идемпотентный upsert по `id`,
поле `version` разрешает конфликты, удаление помечается флагом `deleted` с
наибольшей версией.

Все запросы чтения к ClickHouse используют `query_params` (`{name:Type}`) —
пользовательский ввод не подставляется в SQL строкой, что исключает инъекции.

При погашении сумма скидки считается честно: для `PERCENTAGE` — процент от
переданной `orderAmount` (без суммы заказа записывается 0), для `FIXED` —
величина скидки, ограниченная суммой заказа.

### Frontend — Feature-Sliced Design

```
client/src
├── app/        # инициализация: провайдеры, роутер, layout, глобальные стили
├── pages/      # страницы: dashboard, promocodes, redemptions
├── widgets/    # композиции: sidebar, таблицы, аналитика
├── features/   # действия: форма, действия со строкой, фильтры
├── entities/   # бизнес-сущности: promocode, analytics (model/api/ui)
└── shared/     # ui-kit, api-клиент, lib, config
```

Все таблицы используют **server-side** пагинацию, сортировку и фильтрацию —
данные не грузятся в память целиком.

## API

| Метод | Путь | Сторона | Описание |
| --- | --- | --- | --- |
| `GET` | `/api/promocodes` | Query | Список (page, pageSize, sortField, sortOrder, search, status) |
| `POST` | `/api/promocodes` | Command | Создать |
| `PATCH` | `/api/promocodes/:id` | Command | Обновить |
| `DELETE` | `/api/promocodes/:id` | Command | Удалить |
| `POST` | `/api/promocodes/:id/redeem` | Command | Погасить (тело: `{ orderAmount?: number }`) |
| `GET` | `/api/analytics/summary` | Query | Сводная аналитика (кэш Redis) |
| `GET` | `/api/analytics/redemptions` | Query | Журнал погашений |
| `GET` | `/api/health` | — | Health-check |

## Модель промокода

- `code` — уникальный код
- `discountType` — `PERCENTAGE` | `FIXED`
- `discountValue` — величина скидки
- `maxUsages` — лимит использований (0 = безлимит)
- `usedCount` — счётчик использований
- `status` — `ACTIVE` | `PAUSED` | `EXPIRED`
- `startsAt`, `expiresAt` — период действия
