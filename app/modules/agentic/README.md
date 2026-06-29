# @qb/agentic

Scaffold module for host apps with two API surfaces:
- Async agent jobs via `/api/agents/call` (callback-based persistence in Mongo).
- Direct LLM calls via `/api/agents/llm` (multipart + optional files, forwarded to platform `/api/llm`).

Use `/api/agents/llm` for explicit, one-shot LLM tasks (including file analysis) where you pass request instructions directly (`message` + optional `system_prompt`).
Use `/api/agents/call` for scaffold workflow execution that relies on keyspace repository state (`.claude`, skills, workflow files).

## Critical: Client/Server Boundary

Use the right entrypoint:

| Import | Use from | Contains |
|---|---|---|
| `from "@qb/agentic"` | client + server-safe code | `submit`, `getList`, `invokeLLM`, shared types |
| `from "@qb/agentic/server"` | server-only files | `agentsRouter`, `AgentJobModel`, server-only types |

Do not import server-only exports from browser code.
If a file runs in browser/runtime-shared context, only import from `@qb/agentic`.

## Setup

| Variable | Description |
|---|---|
| `QB_SCAFFOLDER_KEY` | Shared secret sent as `Authentication` header to agentic platform |
| `_KEYSPACE` | Keyspace sent as `x-id-keyspace` |

Routes are auto-discovered under `/api/agents/*`.

## Architecture

### Async call path
`POST /api/agents/call` -> scaffold -> `POST /api/call` -> platform -> callback to `/api/agents/callback/:id` -> Mongo.

### Direct LLM path
`POST /api/agents/llm` (multipart) -> scaffold -> `POST /api/llm` -> platform -> immediate response.

## Routes

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/agents/call` | Enqueue async agent job. Returns `{ jobId, status: "PENDING" }`. |
| POST | `/api/agents/llm` | Direct LLM invoke. Multipart fields: `message`, `schema`, optional `system_prompt`, optional `files[]`. |
| POST | `/api/agents/callback/:id` | Webhook target for platform callbacks. |
| GET | `/api/agents/list` | List recent async jobs. |

## Client API

```ts
import { submit, getList, invokeLLM } from "@qb/agentic";

// Async job
const { jobId } = await submit("Hello");
const list = await getList({ limit: 20 });

// Direct LLM with optional files
const llm = await invokeLLM({
  message: "Summarize this file",
  schema: {
    type: "object",
    properties: { answer: { type: "string" } },
    required: ["answer"],
  },
  systemPrompt: "You are a strict analyst. Return concise JSON only.", // optional
  files: [fileInput.files[0]],
});
```

## Notes

- `idempotency-key` for `/api/agents/llm` can be sent by caller; if omitted, scaffold derives one from keyspace + payload + file content hash.
- Uploaded files are processed in memory by scaffold route middleware and forwarded upstream; they are not written into app workspace directories.
- `system_prompt` on `/api/agents/llm` is optional and fully user-defined.
- `/api/agents/call` remains as-is; no extra context field is required in request body.
