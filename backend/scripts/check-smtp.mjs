import "dotenv/config";
import nodemailer from "nodemailer";

const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(`Missing SMTP settings: ${missing.join(", ")}`);
  process.exit(1);
}

const host = process.env.SMTP_HOST;
const password = host.toLowerCase() === "smtp.gmail.com"
  ? process.env.SMTP_PASS.replaceAll(/\s/g, "")
  : process.env.SMTP_PASS;
const transport = nodemailer.createTransport({
  host,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: { user: process.env.SMTP_USER, pass: password },
  connectionTimeout: 8_000,
  greetingTimeout: 8_000,
  socketTimeout: 15_000,
});

try {
  await transport.verify();
  console.log("SMTP connection and authentication succeeded.");
} catch (error) {
  console.error("SMTP verification failed.", {
    code: error.code,
    responseCode: error.responseCode,
    command: error.command,
    message: error.message,
  });
  process.exitCode = 1;
} finally {
  transport.close();
}
