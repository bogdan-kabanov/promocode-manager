# PromoCode Manager

Приложение для управления промокодами с аналитикой (задание v3.0).  
CQRS: запись и бизнес-решения в **MongoDB**, списки и аналитика из **ClickHouse**, синхронизация через outbox, гонки применений — через **Redis**.

## Быстрый старт

```bash
git clone <репозиторий> && cd <репозиторий>
docker compose up --build
```

До 10 минут на чистой машине (сборка образов входит в срок). Готовность: `GET http://localhost:3000/api/health` → `200`.

| Сервис | URL / порт |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| MongoDB | 27017 |
| ClickHouse | 8123 |
| Redis | 6379 |

Часовой пояс контейнеров: переменная `TZ` (по умолчанию `UTC`).  
Файл `.env` не обязателен — у всех переменных есть значения по умолчанию.

### Демо-пользователь

| Поле | Значение |
| --- | --- |
| Телефон | `+79991234567` |
| Пароль | `Demo1234!` |

После первого запуска демо-данные создаются автоматически (идемпотентно): ≥10 пользователей, ≥8 промокодов (истёкший, ещё не начавшийся, деактивированный, исчерпанный, бессрочный), ≥200 заказов, ≥150 применений с разбросом по «Сегодня» / 7 / 30 дней.

## Документация API

См. [API.md](./API.md).

## Стек

- Backend: NestJS, TypeScript, Mongoose, `@clickhouse/client`, `libphonenumber-js/mobile`, Redis, JWT, bcrypt
- Frontend: React + Vite, TypeScript, TanStack Query/Table, React Hook Form + Zod
- БД: MongoDB, ClickHouse, Redis
- Инфра: Docker Compose

## Аналитические таблицы ClickHouse

Схема создаётся **при каждом старте** приложения (`ClickhouseService.ensureSchema`), не init-скриптом тома. Есть и `CREATE TABLE IF NOT EXISTS`, и `ALTER … ADD COLUMN IF NOT EXISTS` для уже существующих томов.

| Таблица | Состав и зачем |
| --- | --- |
| `users` | зеркало пользователя + `phone_digits` для поиска без разделителей |
| `promocodes` | полное зеркало промокода; состояние вычисляется в SQL при чтении |
| `orders` | суммы в копейках + денормализованные `user_name` / `user_phone` / `promocode_code` |
| `promo_usages` | журнал применений + денормализованные имя/телефон (на момент применения) |

Деньги хранятся в **копейках (Int64)** — агрегаты в ClickHouse сходятся до копейки; в API отдаются числа с двумя знаками через `toApiNumber`.

Служебная колонка `version` (UInt64) — для `ReplacingMergeTree`; наружу не отдаётся.

### Отсечение по датам (prune до чтения)

| Эндпоинт | Колонка | Организация хранения |
| --- | --- | --- |
| `/analytics/users/fetch/many` | `orders.created_at` | `PARTITION BY toYYYYMM(created_at), ORDER BY (created_at, mongo_id)` |
| `/analytics/promocodes/fetch/many` | `promo_usages.used_at` | `PARTITION BY toYYYYMM(used_at), ORDER BY (used_at, mongo_id)` |
| `/analytics/usages/fetch/many` | `promo_usages.used_at` | то же |

Пример на демо-данных после первого сида (измерение = число строк
`promo_usages`, попадающих в предикат `used_at` — при `ORDER BY (used_at, mongo_id)`
и `PARTITION BY toYYYYMM(used_at)` ClickHouse не читает части вне окна):

```
/analytics/usages/fetch/many без диапазона        — прочитано 191 строк
/analytics/usages/fetch/many за последние 7 дней  — прочитано 121 строк
```

(числа воспроизводятся на чистых томах тем же детерминированным сидом; при
повторном `up` без `down -v` сид пропускается, числа те же).

## Синхронизация MongoDB → ClickHouse

**Механизм: transactional outbox.**

1. Мутация пишется в MongoDB.
2. В коллекцию `outbox_events` добавляется событие.
3. `OutboxWorker` доставляет событие в ClickHouse и помечает `done`.
4. Зеркала — `ReplacingMergeTree(version)` по `mongo_id` (идемпотентный upsert).

Доменные сервисы **не** импортируют ClickHouse: все списки идут через `AnalyticsReadRepository` (модуль `analytics-read`).

### Четыре свойства

| Свойство | Как обеспечено |
| --- | --- |
| Отказ CH не откатывает мутацию | успех клиенту после Mongo + outbox; CH асинхронно |
| Догон без перезапуска | воркер крутится в процессе и забирает `pending` |
| Повторная доставка не меняет показатели | upsert по `mongo_id` + `version` |
| Порядок Mongo → CH | outbox только после успешной записи домена |

**Служебное (не в API):** коллекция `outbox_events` (`entityType`, `entityId`, `payload`, `version`, `status`, `attempts`, `lastError`, `createdAt`, `processedAt`).

Задержка репликации при живом CH обычно ≤ 2 с. UI закрывает разрыв коротким опросом списка до появления строки (`client/src/shared/api/useSyncedMutation.ts`).

## Гонка при применении промокода

Redis-блокировка `lock:promocode:{CODE}` (`SET` NX PX):

| Параметр | Значение по умолчанию | Env |
| --- | --- | --- |
| TTL удержания (аварийное снятие) | **10 000 ms** | `PROMO_LOCK_TTL_MS` |
| Ожидание получения лока | **5 000 ms** | `PROMO_LOCK_WAIT_MS` |

Плюс атомарный `findOneAndUpdate` с условием `usedCount < maxUsagesTotal`.  
При 40 параллельных применениях и лимите 5 — ровно 5 успехов, 5 записей `PromoUsage`, `usedCount = 5`.

## Два сценария Redis

1. **Блокировка применений** — снаружи видно по числу успешных ответов под нагрузкой.
2. **Кэш аналитических списков** (`cache:analytics:*`, TTL **5 с**, `ANALYTICS_CACHE_TTL_SECONDS`). Перед ответом из кэша всегда проверяется доступность ClickHouse: при недоступности — **503**, даже если кэш тёплый.

Пример видимости кэша:

```
/analytics/usages/fetch/many   первый запрос  — уходит в ClickHouse
/analytics/usages/fetch/many   второй (тот же body, <5 с) — из Redis, без повторного тяжёлого запроса
ClickHouse down                 — 503 независимо от кэша
```

Хранение refresh-токенов в Redis обязательно, но вторым сценарием не считается.

## Тексты интерфейса

Словарь: `client/src/shared/i18n/ru.ts`.  
Компоненты берут строки по ключу (`t('…')`), без литералов в разметке.  
Коды ошибок (в т.ч. девять кодов применения) → фразы через `tErrorCode`.  
Подробнее: `client/UI_NOTES.md`.

## Тесты

```bash
cd server && npm test
```

Покрыто: округление скидки «половина вверх» (примеры из ТЗ), девять проверок применения, нормализация телефона, вычисление состояния промокода. **72** теста.

## Что не реализовано и почему

Роли, восстановление пароля, SMS, корзина/каталог, оплата/доставка, статусы заказа, отмена применения, удаление записей, фиксированная скидка и прочие виды скидок — **намеренно вне задания** (ТЗ v3.0): расширения ломают сравнимость и добавляют непроверенные ветки в расчёт денег.

## Неоднозначности и решения

1. **Хранение денег** — копейки (Int64) в Mongo и ClickHouse; в API — number с двумя знаками.
2. **Закрытие лага CH на UI** — короткий poll после мутации до появления `mongoId` с актуальным `updatedAt`.
3. **Второй сценарий Redis** — кэш аналитики с обязательным 503 при падении CH.
4. **Состояние промокода** — вычисляется при каждом чтении (SQL / TS) по текущему UTC-моменту.
5. **Денормализация имени/телефона** — пишется в `orders` / `promo_usages` в момент синхронизации (для usages — на момент применения); история применений не переписывается при смене профиля.
6. **Колонка действий на UI** — не колонка данных из закрытого перечня; нужна, чтобы «всё делалось из интерфейса».

## Локальная разработка (опционально)

```bash
docker compose up mongo clickhouse redis
cd server && npm install && npm run start:dev
cd client && npm install && npm run dev
```
