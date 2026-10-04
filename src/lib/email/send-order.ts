import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getSettings } from "@/lib/data/site";
import { customerEmail, ownerEmail, statusEmail, type StatusKind } from "@/lib/email/templates";
import { getOrder } from "@/lib/orders";
import { site, whatsappLink } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/admin";

let transporter: Transporter | null | undefined;

/**
 * Gmail with an app password by default. For the best inbox placement, use a mail provider and a
 * domain you own (SPF + DKIM + DMARC), then set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_APP_PASSWORD
 * and MAIL_FROM_EMAIL in the environment. No code change is needed.
 */
function getTransporter() {
  if (transporter !== undefined) return transporter;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  const host = process.env.SMTP_HOST;
  if (!user || !pass) {
    transporter = null;
  } else if (host) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  } else {
    transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  }
  return transporter;
}

const fromAddress = () => process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER;

type Mail = { subject: string; html: string; text: string };

/**
 * Headers that mark these as one-to-one transactional messages. Together with a plain-text part,
 * a real reply-to and a subject without sales language, they help mailbox providers file the
 * message as an order notification rather than as promotion.
 */
function transactionalHeaders(orderId: number | null) {
  return {
    "Auto-Submitted": "auto-generated",
    "X-Auto-Response-Suppress": "OOF, AutoReply",
    "X-Entity-Ref-ID": `gog-${orderId ?? "msg"}-${Date.now()}`,
  };
}

async function deliver(orderId: number, kind: string, to: string, mail: Mail) {
  const supabase = createServiceClient();
  const { data: log } = await supabase
    .from("email_log")
    .insert({ order_id: orderId, kind, to_email: to, status: "pending", attempts: 1 })
    .select("id")
    .single();

  const mailer = getTransporter();
  try {
    if (!mailer) throw new Error("Email is not configured (SMTP_USER / SMTP_APP_PASSWORD)");
    await mailer.sendMail({
      from: { name: site.name, address: fromAddress()! },
      to,
      replyTo: { name: site.name, address: site.email },
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      headers: transactionalHeaders(orderId),
    });
    if (log) await supabase.from("email_log").update({ status: "sent" }).eq("id", log.id);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[email] ${kind} for order ${orderId} failed:`, message);
    if (log) await supabase.from("email_log").update({ status: "failed", error: message.slice(0, 500) }).eq("id", log.id);
    return false;
  }
}

/**
 * Send the customer confirmation (if they gave an email) and the owner notification.
 * Never throws: an email problem must not affect the order. Failures are recorded in email_log.
 */
export async function sendOrderEmails(orderId: number, only?: "customer" | "owner") {
  try {
    const order = await getOrder({ id: orderId });
    if (!order) return;
    const settings = await getSettings();
    const base = { siteUrl: site.url, helpline: settings.helpline, contactEmail: settings.email };

    const jobs: Promise<boolean>[] = [];

    if (order.email && only !== "owner") {
      jobs.push(
        deliver(
          orderId,
          "customer_confirmation",
          order.email,
          customerEmail(order, {
            ...base,
            whatsappUrl: whatsappLink(
              `Hello Glance of Gold, I am confirming my order ${order.order_number}.`,
              settings.whatsapp,
            ),
          }),
        ),
      );
    }

    if (only !== "customer") {
      const to = process.env.ORDER_NOTIFY_EMAIL || process.env.SMTP_USER;
      if (to) {
        const customerWa = order.phone.replace(/^0/, "92");
        jobs.push(
          deliver(
            orderId,
            "owner_notification",
            to,
            ownerEmail(order, {
              ...base,
              whatsappCustomerUrl: whatsappLink(
                `Hello ${order.customer_name}, this is Glance of Gold regarding your order ${order.order_number}.`,
                customerWa,
              ),
            }),
          ),
        );
      }
    }

    await Promise.all(jobs);
  } catch (err) {
    console.error("[email] sendOrderEmails failed:", err);
  }
}

/** Short plain notice to the shop owner (e.g. a payment proof arrived). Never throws. */
export async function sendOwnerNote(orderId: number, subject: string, text: string) {
  const to = process.env.ORDER_NOTIFY_EMAIL || process.env.SMTP_USER;
  if (!to) return;
  const html = `<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</p><p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;"><a href="${site.url}/admin/orders/${orderId}">Open in admin</a></p>`;
  await deliver(orderId, "owner_note", to, { subject, html, text: `${text}
${site.url}/admin/orders/${orderId}` });
}

/** Email from the contact form to the shop owner. Replies go straight to the customer. Returns true when sent. */
export async function sendContactMessage(input: { name: string; phone?: string; email?: string; message: string }) {
  const to = process.env.ORDER_NOTIFY_EMAIL || process.env.SMTP_USER;
  const mailer = getTransporter();
  if (!to || !mailer) return false;

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = [`From: ${input.name}`, input.phone && `Phone: ${input.phone}`, input.email && `Email: ${input.email}`].filter(Boolean) as string[];
  try {
    await mailer.sendMail({
      from: { name: `${site.name} website`, address: fromAddress()! },
      to,
      replyTo: input.email || undefined,
      subject: `Website message from ${input.name}`,
      text: `${lines.join("\n")}\n\n${input.message}`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#2A2622"><p>${lines.map(esc).join("<br>")}</p><p style="white-space:pre-wrap;border-left:3px solid #B8935A;padding-left:12px">${esc(input.message)}</p></div>`,
    });
    return true;
  } catch (err) {
    console.error("[email] contact message failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Tells the customer their order moved to a new stage (confirmed, shipped, delivered, ...), with the
 * order's items and totals. Skipped when the customer did not give an email. Never throws.
 */
export async function sendStatusEmail(orderId: number, kind: StatusKind) {
  try {
    const order = await getOrder({ id: orderId });
    if (!order?.email) return false;
    const settings = await getSettings();
    return await deliver(
      orderId,
      `status_${kind}`,
      order.email,
      statusEmail(order, kind, {
        siteUrl: site.url,
        helpline: settings.helpline,
        contactEmail: settings.email,
        whatsappUrl: whatsappLink(`Hello Glance of Gold, I have a question about order ${order.order_number}.`, settings.whatsapp),
      }),
    );
  } catch (err) {
    console.error("[email] sendStatusEmail failed:", err);
    return false;
  }
}
