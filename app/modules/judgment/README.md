# Judgment Engine Module

The **Judgment Engine** is a modular compliance workflow service. It supports two distinct config-authoring flows:

1. **Parse from file**: upload a document and forward it to the local LLM adapter to auto-generate one or more config drafts.
2. **Direct create via API**: submit a fully defined config JSON payload directly without using the LLM.

Submitted evidence is then evaluated against a chosen config using the local LLM adapter with a guarded fallback/error result path.

## Directory Structure

```text
judgment/
|-- README.md
|-- index.ts              ← browser-safe entry (types + getConfigLabels only)
|-- package.json
|-- qb_package.json       ← declares "agentic" module dependency
`-- src/
    |-- controllers/
    |   `-- judgment.controller.ts
    |-- lib/
    |   `-- judgment.utils.ts
    |-- models/
    |   |-- audit.model.ts        → tbl_judgment_audit_logs
    |   |-- config.model.ts       → tbl_judgment_configs
    |   |-- issue.model.ts        → tbl_judgment_issues
    |   |-- submission.model.ts   → tbl_judgment_submissions
    |   `-- task.model.ts         → tbl_judgment_tasks
    |-- routes/
    |   `-- judgment.routes.ts    ← auto-registered by routes.ts scanner
    |-- seeds/
    |   `-- judgment.seed.ts      ← auto-discovered by runSeeds() on startup
    `-- services/
        |-- judgment-config.service.ts
        `-- judgment-submission.service.ts
```

## Key Features

1. **Dynamic schema-driven forms**: Renders `/judgment/:configId/submit` from each config's `inputSchema`.
2. **Dual config-ingestion APIs**: Supports both file parsing through the LLM and direct config creation via JSON API.
3. **Dynamic file upload widgets**: Supports single-file and multi-file fields using `"x-ui": { "widget": "file" }`.
4. **Seeding & synchronization**: `judgment.seed.ts` at the module root is auto-discovered and run by `runSeeds()` on startup (idempotent upsert by `pluginId`).
5. **Structured LLM assessment**: Evaluates submitted evidence against config rules and output schema.
6. **Corrective actions**: Automatically creates issues and follow-up tasks when a submission does not pass.

## Auto-wiring

No manual registration needed:

- **Routes**: `app/api/routes.ts` scans `app/modules/*/src/routes/*.routes.ts` and registers each default export as an Express router.
- **Seeds**: `app/api/seeds/index.ts` scans `app/modules/*/*.seed.ts` and `app/modules/*/src/seeds/*.seed.ts`, then runs any `default` or `seedXxx` exports.

## External Dependencies

- **`~/modules/uploader`** (`uploadFile`) — file uploads in the submission flow.
- **`/api/agents/llm`** — local LLM adapter. Required for config parsing and submission evaluation. Needs `QB_SCAFFOLDER_KEY`; falls back to `buildGenericJudgmentResult` when absent.
- **`~/api/models/base/common-typegoose.entity`** — base entity class used by all five models.

## Configuration Schema

A config object has the following top-level fields:

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `pluginId` | `string` | ✓ | Unique URL-safe slug (alphanumeric, dots, dashes, underscores). Used as the primary lookup key. |
| `name` | `string` | ✓ | Human-readable config title. |
| `rules` | `string` | ✓ | System prompt forwarded to the LLM evaluator. Describes what to assess and any numeric thresholds. |
| `inputSchema` | `object` | ✓ | JSON Schema (`type: "object"`) describing the evidence form fields. See [inputSchema](#inputschema). |
| `outputSchema` | `object` | ✓ | JSON Schema describing the expected LLM result shape. See [outputSchema](#outputschema). |
| `criteria` | `array` | — | Checklist of assessment rules used by the evaluator. See [criteria](#criteria). |
| `variables` | `object` | ✓ | UI labels, task timing, and dashboard metadata. See [variables](#variables). |

### `inputSchema`

Standard JSON Schema with `type: "object"`. Supported property types: `string`, `number`, `boolean`, `array`, `integer`, `object`.

| Property field | Description |
| :--- | :--- |
| `type` | JSON Schema type. For file uploads use `"string"` (single) or `"array"` with `items: { type: "string" }` (multiple). |
| `title` | Display label rendered on the form. |
| `description` | Helper text shown below the field. Also read by the LLM to understand what the field represents. |
| `x-ui.widget` | Set to `"file"` to render a file upload control instead of a text input. Only `"file"` is supported. |

Single-file upload:

```json
"certificate": {
  "type": "string",
  "title": "Training Certificate",
  "description": "PDF certificate of completion.",
  "x-ui": { "widget": "file" }
}
```

Multi-file upload:

```json
"attachments": {
  "type": "array",
  "items": { "type": "string" },
  "title": "Supporting Documents",
  "x-ui": { "widget": "file" }
}
```

### `outputSchema`

JSON Schema describing the object the LLM must return. The standard envelope used by all built-in configs:

| Property | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `id` | `string` | ✓ | Result identifier (set to the submission ID). |
| `evidenceSubmissionId` | `string` | ✓ | Submission ID this result belongs to. |
| `criterionId` | `string` | ✓ | The primary criterion evaluated. |
| `verdict` | `string` enum | ✓ | One of `pass`, `partial`, `fail`, `risk`, `ready`, `not_ready`. |
| `score` | `number` 0–100 | ✓ | Overall compliance score. |
| `confidence` | `number` 0–1 | ✓ | Model confidence in the verdict. |
| `severity` | `string` enum | ✓ | One of `low`, `medium`, `high`, `critical`. |
| `reason` | `string` | ✓ | Plain-language explanation of the verdict. |
| `fixSuggestion` | `string` | ✓ | Actionable corrective recommendation. |
| `requiresHumanReview` | `boolean` | ✓ | Whether a human reviewer must inspect the submission. |
| `provider` | `string` | — | LLM provider identifier. |
| `model` | `string` | — | LLM model identifier. |
| `resultData` | `object` | — | Arbitrary structured data from the LLM (e.g. `complianceStatus`, `missingItems`, `auditTrail`). |

### `criteria`

Array of assessment rules. Each criterion:

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `id` | `string` | ✓ | Unique identifier, conventionally prefixed `criterion_`. |
| `category` | `string` | ✓ | Grouping label (e.g. `Documentation`, `Compliance`). |
| `name` | `string` | ✓ | Short human-readable check name. |
| `passCriteria` | `string` | ✓ | Precise condition the submission must satisfy, including any numeric thresholds. |
| `severity` | `string` enum | ✓ | One of `low`, `medium`, `high`, `critical`. |
| `weight` | `number` | ✓ | Numeric contribution (1–100) to the overall score. |
| `autoFailIfMissing` | `boolean` | ✓ | Force a `fail` verdict if the related evidence field is absent. |

### `variables`

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `variables.labels.unitLabel` | `string` | ✓ | Label for the organizational unit (e.g. `"Department"`). |
| `variables.labels.workerLabel` | `string` | ✓ | Label for the submitting worker (e.g. `"Employee"`). |
| `variables.labels.managerLabel` | `string` | ✓ | Label for the reviewing manager (e.g. `"HR Manager"`). |
| `variables.actions.defaultTaskDueHours` | `number` | ✓ | Hours until a generated corrective action task is due. |
| `variables.dashboard.title` | `string` | ✓ | Dashboard page heading. |
| `variables.dashboard.company` | `string` | ✓ | Company name shown in the dashboard. |

### Sample Config

A complete config object with all fields populated:

```json
{
  "pluginId": "training_certificate_compliance",
  "name": "Training Certificate Compliance",
  "rules": "Review the submitted training certificate. Verify it is a valid PDF and was issued within the last 12 months. Reject submissions with missing, expired, or incorrectly formatted certificates.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "employeeName": {
        "type": "string",
        "title": "Employee Name",
        "description": "Full name of the employee submitting this form."
      },
      "employeeEmail": {
        "type": "string",
        "title": "Employee Email",
        "description": "Work email address of the submitting employee."
      },
      "department": {
        "type": "string",
        "title": "Department",
        "description": "Department the employee belongs to."
      },
      "evidenceText": {
        "type": "string",
        "title": "Evidence / Notes",
        "description": "Supporting notes or observations related to this submission."
      },
      "trainingCertificate": {
        "type": "string",
        "title": "Training Certificate",
        "description": "PDF certificate of completion issued within the last 12 months.",
        "x-ui": { "widget": "file" }
      }
    },
    "required": ["employeeName", "employeeEmail", "department", "evidenceText", "trainingCertificate"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "evidenceSubmissionId": { "type": "string" },
      "criterionId": { "type": "string" },
      "verdict": {
        "type": "string",
        "enum": ["pass", "partial", "fail", "risk", "ready", "not_ready"]
      },
      "score": { "type": "number", "minimum": 0, "maximum": 100 },
      "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
      "severity": {
        "type": "string",
        "enum": ["low", "medium", "high", "critical"]
      },
      "reason": { "type": "string" },
      "fixSuggestion": { "type": "string" },
      "requiresHumanReview": { "type": "boolean" },
      "provider": { "type": "string" },
      "model": { "type": "string" },
      "resultData": {
        "type": "object",
        "properties": {
          "complianceStatus": {
            "type": "string",
            "enum": ["Compliant", "Non-Compliant"]
          },
          "missingItems": { "type": "array", "items": { "type": "string" } },
          "auditTrail": { "type": "array", "items": { "type": "object" } }
        }
      }
    },
    "required": [
      "id", "evidenceSubmissionId", "criterionId",
      "verdict", "score", "confidence", "severity",
      "reason", "fixSuggestion", "requiresHumanReview"
    ]
  },
  "criteria": [
    {
      "id": "criterion_cert_format",
      "category": "Documentation",
      "name": "Certificate Format",
      "passCriteria": "Certificate is uploaded in PDF format.",
      "severity": "high",
      "weight": 40,
      "autoFailIfMissing": true
    },
    {
      "id": "criterion_cert_validity",
      "category": "Compliance",
      "name": "Certificate Validity",
      "passCriteria": "Certificate issue date is within the last 12 months.",
      "severity": "critical",
      "weight": 60,
      "autoFailIfMissing": true
    }
  ],
  "variables": {
    "labels": {
      "unitLabel": "Department",
      "workerLabel": "Employee",
      "managerLabel": "HR Manager"
    },
    "actions": {
      "defaultTaskDueHours": 72
    },
    "dashboard": {
      "title": "Training Compliance Dashboard",
      "company": "Acme Corp"
    }
  }
}
```

### Parse Output Shape

The file-parse LLM flow asks the model to return a top-level object:

```json
{
  "configs": [ { "...": "single config object" } ]
}
```

The Judgment API normalizes that into a plain array response for the frontend.

## REST API Reference

All routes are prefixed with `/api`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/judgment/configs` | Retrieve all loaded configurations |
| `GET` | `/judgment/configs/direct/schema` | Return the JSON schema contract for direct config creation |
| `POST` | `/judgment/configs/direct` | Create a config directly from JSON |
| `GET` | `/judgment/configs/parse/schema` | Return the request/response contract for file parsing |
| `POST` | `/judgment/configs/parse` | Upload a file and auto-generate config drafts via LLM |
| `POST` | `/judgment/configs` | Backward-compatible alias for direct config creation |
| `GET` | `/judgment/configs/:configId` | Get configuration details by ID or `pluginId` |
| `PUT` | `/judgment/configs/:configId` | Update an existing config |
| `POST` | `/judgment/configs/:configId/submit` | Submit evidence data and files for evaluation |
| `GET` | `/judgment/configs/:configId/dashboard` | Get dashboard data (config + recent submissions) |
| `POST` | `/judgment/tasks/:taskId/complete` | Complete a corrective action task |
| `POST` | `/judgment/issues/:issueId/resolve` | Mark a compliance issue resolved |

### Direct Create Example

```bash
curl -X POST http://localhost:3002/api/judgment/configs/direct \
  -H "Content-Type: application/json" \
  -d @config.json
```

### Parse-From-File Example

```bash
curl -X POST http://localhost:3002/api/judgment/configs/parse \
  -F "file=@sop-document.pdf"
```

### Submit Evidence Example

```bash
curl -X POST http://localhost:3002/api/judgment/configs/my_plugin_id/submit \
  -F 'inputData={"employeeName":"Jane","employeeEmail":"jane@co.com","department":"Sales","evidenceText":"Completed training."}' \
  -F "files=@certificate.pdf"
```

> **Important**: the multipart field name for uploaded files must be `files` (plural). Sending `file` will cause a Multer "Unexpected field" 500 error.

## Notes

- The parse flow uses the local `/api/agents/llm` adapter and therefore depends on `QB_SCAFFOLDER_KEY`.
- The parse flow returns generated config drafts only after normalization and validation. Invalid generated configs are rejected before persistence.
- Submission review errors normalize to an explicit failed/human-review result instead of defaulting to a pass-like fallback.
- Config lookup accepts either MongoDB `_id` or `pluginId` interchangeably.
