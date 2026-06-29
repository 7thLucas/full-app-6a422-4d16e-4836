# @qb/email

Local npm package for sending transactional emails via SMTP using [nodemailer](https://nodemailer.com).

## Setup

Copy `.env.example` to the project root `.env` and fill in your SMTP credentials:

| Variable    | Description                                     |
|-------------|-------------------------------------------------|
| `SMTP_HOST` | SMTP server hostname (e.g. `smtp.gmail.com`)    |
| `SMTP_PORT` | SMTP port — `587` (TLS/STARTTLS) or `465` (SSL) |
| `SMTP_USER` | SMTP authentication username                    |
| `SMTP_PASS` | SMTP authentication password or app password    |
| `SMTP_FROM` | Sender address (e.g. `"App <no-reply@app.com>"`) |

`secure` is automatically set to `true` when `SMTP_PORT=465`, otherwise STARTTLS is used.

## Usage

```ts
import { EmailService } from "@qb/email";

await EmailService.sendEmail({
  to: "recipient@example.com",
  subject: "Hello",
  content: "Plain text body. HTML is auto-generated.",
});
```

## API Route

`POST /api/email/send`

```json
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "content": "Your message here"
}
```

Returns `{ success: true, messageId: "<...>" }` on success.
