# Knowledge Item: Google Gemini API Implementation Standards

**Summary**: This guide defines the technical standards for implementing AI features using the Google Gemini API. It covers SDK selection (@google/genai), structured JSON output with schemas, multimodal data handling via the Files API, and safety configuration.

---

## 1. SDK Selection & Setup

> [!IMPORTANT]
> Use `@google/genai` (introduced late 2024) for all new implementations. It supersedes `@google/generative-ai`.

### Installation

```bash
npm install @google/genai
```

### Authentication

The SDK automatically detects the `GEMINI_API_KEY` environment variable.

```javascript
import { GoogleGenAI } from '@google/genai'

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
```

---

## 2. Model Selection (Gemini 2.0)

| Model                     | Use Case             | Strength                                         |
| :------------------------ | :------------------- | :----------------------------------------------- |
| **gemini-2.0-flash**      | Default / Production | Speed, lower cost, high reliability.             |
| **gemini-2.0-flash-lite** | High Volume          | Ultra-fast, specialized for simple tasks.        |
| **gemini-2.0-pro-exp**    | Complex Reasoning    | Deep analysis, coding assistance, high accuracy. |

---

## 3. Structured Data (JSON Mode)

Gemini can strictly follow a JSON Schema, which is critical for application data.

### Schema Definition (JavaScript)

```javascript
const responseSchema = {
  type: 'object',
  properties: {
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          ingredients: { type: 'array', items: { type: 'string' } },
        },
        required: ['name'],
      },
    },
  },
}

const response = await client.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: 'Generate a grocery list for Italian pasta',
  config: {
    response_mime_type: 'application/json',
    response_schema: responseSchema,
  },
})

const data = JSON.parse(response.text)
```

---

## 4. Multimodal & Files API

For files over 20MB (or large batch processing), use the **Files API**. Files are retained for 48 hours.

### Uploading & Prompting

```javascript
const file = await client.files.upload('path/to/video.mp4', {
  mime_type: 'video/mp4',
  display_name: 'Cooking Tutorial',
})

const response = await client.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: [
    { file_data: { file_uri: file.uri, mime_type: file.mime_type } },
    'Summarize the key steps in this video.',
  ],
})
```

---

## 5. Interactions (Multi-turn Chat)

### Stateless (Manual History)

```javascript
const response = await client.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: [
    { role: 'user', parts: [{ text: 'Hello!' }] },
    { role: 'model', parts: [{ text: 'Hi there! How can I help?' }] },
    { role: 'user', parts: [{ text: "What's the weather?" }] },
  ],
})
```

### Stateful (Interactions API)

Allows the server to track session state across requests.

```javascript
const chat = client.chats.create({ model: 'gemini-2.0-flash' })
const result = await chat.sendMessage('Why is the sky blue?')
```

---

## 6. Safety & Performance Config

### System Instructions

Guides the model's persona globally.

```javascript
config: {
  system_instruction: 'You are a professional nutritionist. Provide data in metric units.'
}
```

### Safety Thresholds

```javascript
config: {
  safety_settings: [
    { category: 'HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARASSMENT', threshold: 'BLOCK_NONE' },
  ]
}
```

---

## 7. Error Handling

| Status  | Meaning             | Action                             |
| :------ | :------------------ | :--------------------------------- |
| **429** | Rate Limit Exceeded | Implement exponential backoff.     |
| **400** | Bad Request         | Check JSON schema or prompt size.  |
| **500** | Server Error        | Retry after a short delay.         |
| **403** | Permission          | Verify API key and billing status. |

---

## Summary for Agents

1.  **Always** use a schema for structured data.
2.  **Prefer** `gemini-2.0-flash` for its balance of cost and intelligence.
3.  **Include** image/file references _before_ the text instructions in multimodal prompts.
4.  **Check** `response.usage_metadata` to monitor token costs.
