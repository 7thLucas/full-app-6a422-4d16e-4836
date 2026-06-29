import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  content: string;
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    throw new Error("Missing required SMTP environment variables: SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM");
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
    from,
  };
}

export class EmailService {
  static async sendEmail({ to, subject, content }: SendEmailOptions) {
    const { transporter, from } = createTransport();

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: content,
      html: `<p>${content.replace(/\n/g, "<br>")}</p>`,
    });

    return { messageId: info.messageId };
  }
}
