# Knowledge Item: Sync & Persistence Standards

**Summary**: Technical standard for data persistence in the Cloudflare KV environment. Defines the "Snapshot" pattern and SESSION binding requirements.

---

## 1. Storage Backend

The application uses **Cloudflare KV** via the `SESSION` binding.

- Primary Key: `RECIPE_DATA` (Stores the entire array of recipes).

## 2. Persistence Pattern

The app uses a **Snapshot Sync** pattern:

1.  **GET**: Fetches the entire JSON string, parses it, and returns an array.
2.  **POST**: Receives the entire modified array and replaces the existing KV value.

> [!CAUTION]
> Because this pattern replaces the entire array, always ensure the client sends the FULL state to avoid data loss.

## 3. Implementation (Astro)

API routes access the environment via `locals.runtime.env.SESSION`.

- **Reading**: `await SESSION.get('RECIPE_DATA')`
- **Writing**: `await SESSION.put('RECIPE_DATA', JSON.stringify(body))`
- **Payload Limit**: Keep items efficient as KV has value size limits (typically 25MB).
