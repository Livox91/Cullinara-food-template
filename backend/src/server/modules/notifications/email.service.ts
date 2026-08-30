import "server-only";
import nodemailer from "nodemailer";
import { getEnvironment } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";

type OutboxEmailEvent = {
  eventType: string;
  payload: unknown;
};

function payload(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function smtpSettings() {
  const env = getEnvironment();
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.",
    );
  }
  return env;
}

function smtpPassword(host: string, password: string): string {
  return host.toLowerCase() === "smtp.gmail.com"
    ? password.replaceAll(/\s/g, "")
    : password;
}

export const emailService = {
  supports(event: OutboxEmailEvent) {
    if (event.eventType === "BusinessMemberInvited") return true;
    return (
      event.eventType === "IdentityVerificationRequested" &&
      payload(event.payload).channel === "EMAIL"
    );
  },

  async deliver(event: OutboxEmailEvent) {
    const env = smtpSettings();
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: smtpPassword(env.SMTP_HOST!, env.SMTP_PASS!),
      },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
    });
    const data = payload(event.payload);
    const fromAddress = env.SMTP_FROM_EMAIL ?? env.SMTP_USER;
    const from = `"${env.SMTP_FROM_NAME.replaceAll('"', "")}" <${fromAddress}>`;

    if (event.eventType === "IdentityVerificationRequested") {
      if (data.channel !== "EMAIL" || typeof data.target !== "string") {
        throw new Error("Only email verification can be delivered by SMTP.");
      }
      const code = String(data.code ?? "");
      await transporter.sendMail({
        from,
        to: data.target,
        subject: "Your Culinara verification code",
        text: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this code, ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Verify your account</h2><p>Use this code to finish joining the restaurant team:</p><p style="font-size:30px;font-weight:700;letter-spacing:6px">${escapeHtml(code)}</p><p>This code expires in 10 minutes.</p></div>`,
      });
      return;
    }

    const membershipId = String(data.membershipId ?? "");
    const membership = await getPrisma().businessMembership.findUnique({
      where: { id: membershipId },
      include: {
        business: true,
        user: { select: { email: true } },
      },
    });
    if (!membership?.user.email) {
      throw new Error("The invited member does not have an email address.");
    }
    const owner = await getPrisma().businessMembership.findFirst({
      where: {
        businessId: membership.businessId,
        role: "OWNER",
        status: "ACTIVE",
        user: { email: { not: null } },
      },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
    });
    const invitationUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/business/invitations`;
    await transporter.sendMail({
      from,
      replyTo: owner?.user.email ?? undefined,
      to: membership.user.email,
      subject: `You’re invited to join ${membership.business.displayName}`,
      text: `You have been invited to join ${membership.business.displayName} as ${membership.role}. Sign in and accept the invitation: ${invitationUrl}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>You’re invited</h2><p>You have been invited to join <strong>${escapeHtml(membership.business.displayName)}</strong> as <strong>${escapeHtml(membership.role.replaceAll("_", " "))}</strong>.</p><p><a href="${escapeHtml(invitationUrl)}" style="display:inline-block;padding:12px 18px;background:#dc4b22;color:white;text-decoration:none;border-radius:8px">Review invitation</a></p></div>`,
    });
  },
};
