/**
 * Edge Function: dispatch-alerts
 *
 * Cron-triggered function that fetches pending security alerts and
 * dispatches them to the appropriate channels (Slack, email).
 * Dashboard alerts are intentionally skipped — they remain "pending"
 * so the admin UI can query and display them.
 *
 * Auth: requires either INTERNAL_CRON_SECRET (x-cron-secret header)
 * or SUPABASE_SERVICE_ROLE_KEY (Authorization: Bearer header).
 * Both use HMAC-based constant-time comparison to prevent timing attacks.
 *
 * Environment variables:
 *   INTERNAL_CRON_SECRET  – Shared secret for cron invocations
 *   SLACK_WEBHOOK_URL     – Slack incoming webhook URL
 *   RESEND_API_KEY        – Resend API key for email delivery
 *   ALERT_EMAIL_FROM      – Sender address for alert emails
 *   ALERT_EMAIL_TO        – Recipient address for alert emails
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createServiceClient, handleError, handleOptions, jsonResponse } from "../_shared/runtime.ts";

const cronSecret = Deno.env.get("INTERNAL_CRON_SECRET");
const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const alertEmailFrom = Deno.env.get("ALERT_EMAIL_FROM");
const alertEmailTo = Deno.env.get("ALERT_EMAIL_TO");

const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/**
 * HMAC-based constant-time string comparison.
 * Both inputs are signed with the same HMAC key, producing fixed-length
 * digests that are XOR-compared byte-by-byte. This prevents timing
 * side-channels regardless of input length differences.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode("rate-limit-hmac-key");
  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(a)),
    crypto.subtle.sign("HMAC", key, encoder.encode(b)),
  ]);
  const bufA = new Uint8Array(sigA);
  const bufB = new Uint8Array(sigB);
  let mismatch = 0;
  for (let i = 0; i < bufA.length; i++) {
    mismatch |= bufA[i] ^ bufB[i];
  }
  return mismatch === 0;
}

/** Validate the request against cron secret or service role key. */
async function isAuthorized(req: Request) {
  const providedSecret = req.headers.get("x-cron-secret") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";

  if (cronSecret && providedSecret.length > 0 && await timingSafeEqual(providedSecret, cronSecret)) {
    return true;
  }

  const expectedBearer = `Bearer ${serviceRoleKey}`;
  if (authorization.length > 0 && await timingSafeEqual(authorization, expectedBearer)) {
    return true;
  }

  return false;
}

async function sendSlackAlert(payload: Record<string, unknown>) {
  if (!slackWebhookUrl) {
    throw new Error("SLACK_WEBHOOK_URL is not configured");
  }

  const response = await fetch(slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text:
        `[${payload.severity}] ${payload.event_type} user=${payload.user_id ?? "n/a"} tenant=${payload.tenant_id ?? "n/a"}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              `*${payload.event_type}*\nSeverity: ${payload.severity}\nUser: ${payload.user_id ?? "n/a"}\nTenant: ${payload.tenant_id ?? "n/a"}`,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack delivery failed: ${await response.text()}`);
  }
}

async function sendEmailAlert(payload: Record<string, unknown>) {
  if (!resendApiKey || !alertEmailFrom || !alertEmailTo) {
    throw new Error("Email alert environment is incomplete");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: alertEmailFrom,
      to: [alertEmailTo],
      subject: `[${payload.severity}] ${payload.event_type}`,
      text: JSON.stringify(payload, null, 2),
    }),
  });

  if (!response.ok) {
    throw new Error(`Email delivery failed: ${await response.text()}`);
  }
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    if (!await isAuthorized(req)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const serviceClient = createServiceClient();
    const { data: alerts, error } = await serviceClient.rpc(
      "get_pending_security_alerts",
      { p_limit: 100 },
    );

    if (error) throw error;

    const results: { alert_id: string; status: string; channel?: string }[] = [];

    for (const alert of alerts ?? []) {
      // Dashboard alerts stay pending for the admin UI to display
      if (alert.channel === "dashboard") {
        results.push({ alert_id: alert.alert_id, status: "pending", channel: "dashboard" });
        continue;
      }

      try {
        if (alert.channel === "slack") {
          await sendSlackAlert(alert);
        } else if (alert.channel === "email") {
          await sendEmailAlert(alert);
        }

        const recipient = alert.channel === "email"
          ? alertEmailTo ?? null
          : "slack-webhook";

        await serviceClient.rpc("mark_security_alert_status", {
          p_alert_id: alert.alert_id,
          p_status: "sent",
          p_recipient: recipient,
        });

        results.push({ alert_id: alert.alert_id, status: "sent" });
      } catch (deliveryError) {
        console.error(deliveryError);
        await serviceClient.rpc("mark_security_alert_status", {
          p_alert_id: alert.alert_id,
          p_status: "failed",
          p_recipient: null,
        });
        results.push({ alert_id: alert.alert_id, status: "failed" });
      }
    }

    return jsonResponse({ results });
  } catch (error) {
    return handleError(error);
  }
});
