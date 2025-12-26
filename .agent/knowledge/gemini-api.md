# Knowledge Item: Google Gemini API Implementation Standards

**Summary**: Definitive technical standards for the Gemini API using the @google/genai SDK, including JSON schemas and multimodal file handling.

---

## SDK Standard

- **Package**: `@google/genai` (Modern SDK).
- **Initialization**: Use `const client = new Client();` (autodetects `GEMINI_API_KEY`).

## Preferred Models

- `gemini-2.0-flash`: Standard for performance and cost.
- `gemini-2.0-pro-exp`: Use for complex logic or coding tasks.

## Content Handling

- **Structured Data**: Always use `response_mime_type: "application/json"` and provide a `response_schema`.
- **Multimodal**: Use the **Files API** for large media. Place file references BEFORE text prompts.
- **Chat History**: Prefer stateless history (passing an array of turns) unless long-term session persistence is required.

## Safety Configuration

- Default to `BLOCK_ONLY_HIGH` for most categories to ensure utility while staying safe.

## Error Handling

- Always implement exponential backoff for `429` (Rate Limit) errors.
