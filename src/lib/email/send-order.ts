import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getSettings } from "@/lib/data/site";
import { customerEmail, ownerEmail } from "@/lib/email/templates";
import { getOrder } from "@/lib/orders";
import { site, whatsappLink } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/admin";

let transporter: Transporter | null | undefined;

function getTransporter() {
  if (transporter !== undefined) return transporter;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  transporter =
    user && pass ? nodemailer.createTransport({ service: "gmail", auth: { user, pass } }) : null;
  return transporter;
}

type Mail = { subject: string; html: string; text: string };

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
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to,
      replyTo: site.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
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
