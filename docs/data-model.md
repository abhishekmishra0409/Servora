# Data Model

```mermaid
erDiagram
  TENANT ||--o{ BRANCH : owns
  TENANT ||--o{ MEMBERSHIP : grants
  BRANCH ||--o{ MENU_CATEGORY : scopes
  BRANCH ||--o{ MENU_ITEM : scopes
  BRANCH ||--o{ FLOOR : contains
  FLOOR ||--o{ TABLE : contains
  TABLE ||--o{ QR_CODE : maps
  TABLE ||--o{ TABLE_SESSION : opens
  TABLE_SESSION ||--o{ ORDER : submits
  TABLE_SESSION ||--o{ SERVICE_REQUEST : raises
```

- `menu_categories` embeds subcategories.
- `menu_items` embeds variants, add-on groups, schedules, and branch overrides.
- `table_sessions` embeds participants and the mutable shared bucket.
- `orders` embed immutable snapshots of items and add-ons.

