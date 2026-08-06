# PromoCode Manager — API

Префикс всех маршрутов: `/api`.  
Формат тел: JSON, `camelCase`. Параметры путей: `snake_case` (`:mongo_id`).  
Моменты времени: ISO 8601 с нулевым смещением и миллисекундами (`2026-07-30T07:46:34.475Z`), пустое — `null`.  
Деньги: число с ровно двумя знаками после запятой.  
Телефон в ответах: E.164 (`+79991234567`).

## Авторизация

Заголовок: `Authorization: Bearer <accessToken>`.

Без токена открыты только:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /health`

| Метод | Путь | Тело | Ответ |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ phone, password, name }` | `201` пользователь без `passwordHash` |
| POST | `/auth/login` | `{ phone, password }` | `200` `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | `{ refreshToken }` | `200` новая пара токенов (refresh одноразовый) |

TTL по умолчанию: access 15 мин, refresh 7 дней (через env).

## Общий формат списков

`POST <entity>/fetch/many`

```json
{
  "pageIndex": 0,
  "pageSize": 20,
  "sortBy": "createdAt",
  "sortOrder": "desc"
}
```

```json
{
  "data": [],
  "totalCount": 0
}
```

| Поле | Правила |
| --- | --- |
| `pageIndex` | целое ≥ 0, по умолчанию 0 |
| `pageSize` | 1…100, по умолчанию 20 |
| `sortBy` | одно из допустимых для эндпоинта |
| `sortOrder` | `asc` \| `desc`, по умолчанию `desc` |
| `dateFrom` / `dateTo` | только `/analytics/*`, полуинтервал `[from, to)` |

Неизвестное поле тела → `400` с именем поля.  
Недопустимый `sortBy` → `400` с перечнем допустимых.

Сортировка по умолчанию: `createdAt` (для истории использований — `usedAt`).  
Пустые значения сортируемого поля — в конце. При равенстве — `mongoId` по возрастанию.

## Пользователи

| Метод | Путь | Хранилище | Назначение |
| --- | --- | --- | --- |
| POST | `/users/fetch/many` | ClickHouse | список; `sortBy`: `name`, `phone`, `createdAt`; фильтры: `search`, `isActive` |
| GET | `/users/fetch/one/:mongo_id` | MongoDB | один документ |
| PUT | `/users/update/:mongo_id` | MongoDB | имя и телефон; `PHONE_TAKEN` |
| POST | `/users/deactivate/:mongo_id` | MongoDB | идемпотентно; `CANNOT_DEACTIVATE_SELF` |
| POST | `/users/activate/:mongo_id` | MongoDB | идемпотентно |

## Промокоды

| Метод | Путь | Хранилище | Назначение |
| --- | --- | --- | --- |
| POST | `/promocodes/fetch/many` | ClickHouse | `sortBy`: `code`, `discountPercent`, `usedCount`, `validUntil`, `createdAt`; фильтры: `search`, `state` |
| GET | `/promocodes/fetch/one/:mongo_id` | MongoDB | один документ |
| POST | `/promocodes/create` | MongoDB | создание |
| PUT | `/promocodes/update/:mongo_id` | MongoDB | без `code` / `isActive` / `usedCount` в теле |
| POST | `/promocodes/deactivate/:mongo_id` | MongoDB | идемпотентно |
| POST | `/promocodes/activate/:mongo_id` | MongoDB | идемпотентно |

Состояния: `DISABLED`, `EXHAUSTED`, `EXPIRED`, `SCHEDULED`, `ACTIVE` (в этом приоритете).

## Заказы

| Метод | Путь | Тело | Назначение |
| --- | --- | --- | --- |
| POST | `/orders/fetch/many` | фильтры | только заказы текущего пользователя; `sortBy`: `createdAt`, `amount`, `finalAmount`; `hasPromocode` |
| GET | `/orders/fetch/one/:mongo_id` | — | чужой → `403` |
| POST | `/orders/create` | `{ amount }` | владелец из токена; поле владельца в теле → `400` |
| POST | `/orders/apply-promocode/:mongo_id` | `{ code }` | сумма в теле → `400` |

### Коды применения промокода (порядок проверок)

| # | Код | HTTP |
| --- | --- | --- |
| 1 | `ORDER_NOT_FOUND` | 404 |
| 2 | `ORDER_FORBIDDEN` | 403 |
| 3 | `ORDER_ALREADY_HAS_PROMOCODE` | 409 |
| 4 | `PROMOCODE_NOT_FOUND` | 404 |
| 5 | `PROMOCODE_DISABLED` | 409 |
| 6 | `PROMOCODE_NOT_STARTED` | 409 |
| 7 | `PROMOCODE_EXPIRED` | 409 |
| 8 | `PROMOCODE_LIMIT_REACHED` | 409 |
| 9 | `USER_LIMIT_REACHED` | 409 |

## Аналитика

Только эти эндпоинты принимают `dateFrom` / `dateTo`.

| Метод | Путь | `sortBy` |
| --- | --- | --- |
| POST | `/analytics/users/fetch/many` | `name`, `phone`, `ordersCount`, `totalSpent`, `totalDiscount`, `promocodesUsed` |
| POST | `/analytics/promocodes/fetch/many` | `code`, `usageCount`, `uniqueUsers`, `grossRevenue`, `totalDiscount` |
| POST | `/analytics/usages/fetch/many` | `usedAt`, `promocodeCode`, `orderAmount`, `discountAmount` |

Фильтр дат пользователей — по `orders.created_at`.  
Фильтр дат промокодов и истории — по `promo_usages.used_at`.

## Health

`GET /health` — без токена.  
`200`, если MongoDB, ClickHouse и Redis доступны; иначе `503`.  
Тело содержит статус каждой зависимости.

## Ошибки

Валидация:

```json
{
  "statusCode": 400,
  "message": "Проверка полей не пройдена",
  "details": {
    "field_errors": [
      { "field": "discountPercent", "message": "допустимы значения от 1 до 100" }
    ]
  }
}
```

Бизнес-конфликт / именованные коды:

```json
{
  "statusCode": 409,
  "message": "Срок действия промокода истёк",
  "details": { "code": "PROMOCODE_EXPIRED" }
}
```

Машиночитаемый `details.code` приходит при любом статусе, где задание код назвало (`404`, `403`, `401 USER_DISABLED`, `400 DATE_RANGE_INVALID` и т.д.).

Прочие: `401` — нет/невалиден токен; `403` — нет прав; `404` — не найдено; `503` — аналитическое хранилище недоступно.
