import {
  buildShareMessage,
  buildSharePageUrl,
  buildShareUrl,
  getReferralBaseUrl,
  getStoreLocations,
} from "@/lib/referral-share";

const FROM =
  process.env.REFERRAL_FROM_EMAIL?.trim() ||
  "Tell your friends <rewards@refer.thegreenjar.xyz>";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  // Lazy require so builds without the key still typecheck routes that import helpers
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend") as typeof import("resend");
  return new Resend(key);
}

function footerHtml(unsubscribeUrl: string | null) {
  const locations = getStoreLocations()
    .map(
      (loc) =>
        `<div style="margin:0 0 6px;"><a href="${escapeHtml(loc.mapsUrl)}" style="color:#167238;text-decoration:underline;">${escapeHtml(loc.city)} — ${escapeHtml(loc.line)}</a></div>`,
    )
    .join("");
  const unsub = unsubscribeUrl
    ? `<p style="margin:16px 0 0;"><a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p>`
    : "";
  return `
    <hr style="border:none;border-top:1px solid #eaecf0;margin:28px 0 16px;" />
    <div style="color:#667085;font-size:12px;line-height:1.5;">
      <div style="margin:0 0 8px;font-weight:700;color:#344054;">Visit us in store</div>
      ${locations}
      <div style="margin:8px 0 0;">21+ only · While supplies last</div>
      ${unsub}
    </div>
  `;
}

function footerText(unsubscribeUrl: string | null) {
  const lines = [
    "Visit us in store:",
    ...getStoreLocations().flatMap((loc) => [
      `${loc.city} — ${loc.line}`,
      loc.mapsUrl,
    ]),
    "21+ only · While supplies last",
  ];
  if (unsubscribeUrl) lines.push(`Unsubscribe: ${unsubscribeUrl}`);
  return lines.join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapHtml(title: string, body: string, unsubscribeUrl: string | null) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f7f8fa;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#101828;">
  <div style="max-width:560px;margin:0 auto;padding:28px 24px;background:#fff;border:1px solid #eaecf0;border-radius:16px;">
    <p style="margin:0 0 8px;color:#167238;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">The Green Jar</p>
    <h1 style="margin:0 0 16px;font-size:22px;letter-spacing:-0.02em;">${escapeHtml(title)}</h1>
    ${body}
    ${footerHtml(unsubscribeUrl)}
  </div>
</body></html>`;
}

function ctaButton(href: string, label: string) {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:linear-gradient(135deg,#167238,#2bb84d);color:#fff;font-weight:800;text-decoration:none;">${escapeHtml(label)}</a></p>`;
}

function unsubscribeUrlFor(token: string) {
  return `${getReferralBaseUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

type SendResult = { ok: true; id?: string } | { ok: false; error: string };

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string | null;
}): Promise<SendResult> {
  try {
    const resend = getResend();
    const headers: Record<string, string> = {};
    if (input.unsubscribeUrl) {
      headers["List-Unsubscribe"] = `<${input.unsubscribeUrl}>`;
    }

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: Object.keys(headers).length ? headers : undefined,
    });

    if (error) {
      console.error("Resend error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email.";
    console.error("Email send failed:", error);
    return { ok: false, error: message };
  }
}

export async function sendSignupConfirmationEmail(input: {
  to: string;
  name: string;
  phoneDisplay: string;
  phoneE164: string;
  unsubscribeToken: string;
}): Promise<SendResult> {
  const unsub = unsubscribeUrlFor(input.unsubscribeToken);
  const shareUrl = buildShareUrl(input.phoneE164);
  const sharePage = buildSharePageUrl(input.phoneE164);
  const message = buildShareMessage(input.phoneDisplay, shareUrl);

  const html = wrapHtml(
    "You’re in — tell your friends",
    `
      <p style="margin:0 0 12px;line-height:1.5;">Hey ${escapeHtml(input.name)}, thanks for joining Tell your friends.</p>
      <p style="margin:0 0 12px;line-height:1.5;">Friends use <strong>your number</strong> (${escapeHtml(input.phoneDisplay)}) at checkout for a free THC drink or free gram <em>with purchase</em>. When they redeem, you get a unique code for yours.</p>
      ${ctaButton(sharePage, "Text your friends")}
      <p style="margin:0;color:#667085;font-size:13px;line-height:1.5;">Or copy this message:<br/><em>${escapeHtml(message)}</em></p>
      <p style="margin:16px 0 0;font-size:13px;">Your link: <a href="${escapeHtml(shareUrl)}">${escapeHtml(shareUrl)}</a></p>
    `,
    unsub,
  );

  const text = [
    `Hey ${input.name}, thanks for joining Tell your friends.`,
    `Friends use your number (${input.phoneDisplay}) at checkout.`,
    `Text your friends: ${sharePage}`,
    message,
    `Your link: ${shareUrl}`,
    "",
    footerText(unsub),
  ].join("\n");

  return sendEmail({
    to: input.to,
    subject: "Tell your friends — your share link is ready",
    html,
    text,
    unsubscribeUrl: unsub,
  });
}

export async function sendClaimCodeEmail(input: {
  to: string;
  name: string;
  claimCode: string;
  unsubscribeToken: string;
}): Promise<SendResult> {
  const unsub = unsubscribeUrlFor(input.unsubscribeToken);
  const html = wrapHtml(
    "Your reward code",
    `
      <p style="margin:0 0 12px;line-height:1.5;">Hey ${escapeHtml(input.name)} — someone just used your number at The Green Jar.</p>
      <p style="margin:0 0 8px;line-height:1.5;">Your reward code is:</p>
      <p style="margin:0 0 16px;font-size:28px;font-weight:900;letter-spacing:0.08em;color:#167238;">${escapeHtml(input.claimCode)}</p>
      <p style="margin:0;line-height:1.5;">Show this code at the counter for your free THC drink or free gram (one-time use, expires in 90 days).</p>
    `,
    unsub,
  );

  const text = [
    `Hey ${input.name} — someone just used your number at The Green Jar.`,
    `Your reward code is: ${input.claimCode}`,
    "Show this code at the counter for your free THC drink or free gram (one-time use).",
    "",
    footerText(unsub),
  ].join("\n");

  return sendEmail({
    to: input.to,
    subject: `Your Green Jar reward code: ${input.claimCode}`,
    html,
    text,
    unsubscribeUrl: unsub,
  });
}

export async function sendBecomeReferrerEmail(input: {
  to: string;
  friendName: string;
  prefill?: { name?: string; email?: string; phone?: string };
}): Promise<SendResult> {
  const root = getReferralBaseUrl();
  const params = new URLSearchParams();
  if (input.prefill?.name) params.set("name", input.prefill.name);
  if (input.prefill?.email) params.set("email", input.prefill.email);
  if (input.prefill?.phone) params.set("phone", input.prefill.phone);
  const signupUrl = params.toString() ? `${root}/?${params}` : `${root}/`;

  const html = wrapHtml(
    "Want your own rewards?",
    `
      <p style="margin:0 0 12px;line-height:1.5;">Thanks for shopping The Green Jar — enjoy your free gram or THC drink.</p>
      <p style="margin:0 0 12px;line-height:1.5;">Want yours next? Sign up and share <strong>your</strong> number. When a friend redeems, you get a unique reward code.</p>
      ${ctaButton(signupUrl, "Become a referrer")}
    `,
    null,
  );

  const text = [
    `Hey ${input.friendName}, thanks for shopping The Green Jar.`,
    "Want yours next? Sign up and share your number:",
    signupUrl,
    "",
    footerText(null),
  ].join("\n");

  return sendEmail({
    to: input.to,
    subject: "Tell your friends at The Green Jar — earn your own reward",
    html,
    text,
  });
}

export async function sendWeeklyProgressEmail(input: {
  to: string;
  name: string;
  phoneDisplay: string;
  phoneE164: string;
  unsubscribeToken: string;
  friendsRedeemed: number;
  pendingCodes: number;
  claimedRewards: number;
}): Promise<SendResult> {
  const unsub = unsubscribeUrlFor(input.unsubscribeToken);
  const shareUrl = buildShareUrl(input.phoneE164);
  const sharePage = buildSharePageUrl(input.phoneE164);
  const message = buildShareMessage(input.phoneDisplay, shareUrl);
  const hasStats = input.friendsRedeemed > 0;

  const statsBlock = hasStats
    ? `<p style="margin:0 0 16px;line-height:1.5;"><strong>${input.friendsRedeemed}</strong> friends have redeemed · <strong>${input.pendingCodes}</strong> reward codes waiting · <strong>${input.claimedRewards}</strong> already claimed.</p>`
    : `<p style="margin:0 0 16px;line-height:1.5;">You haven’t had a friend redeem yet — text a few people today and get the ball rolling.</p>`;

  const html = wrapHtml(
    "Your weekly update",
    `
      <p style="margin:0 0 12px;line-height:1.5;">Hey ${escapeHtml(input.name)} — here’s your Tell your friends update.</p>
      ${statsBlock}
      <p style="margin:0 0 12px;line-height:1.5;">Friends get a free gram or THC drink <em>with purchase</em> when they use your number. You get a unique code for a free gram or THC drink when they do.</p>
      ${ctaButton(sharePage, "Text your friends")}
      <p style="margin:0;color:#667085;font-size:13px;line-height:1.5;">${escapeHtml(message)}</p>
      <p style="margin:16px 0 0;font-size:13px;">Your link: <a href="${escapeHtml(shareUrl)}">${escapeHtml(shareUrl)}</a></p>
    `,
    unsub,
  );

  const text = [
    `Hey ${input.name} — here’s your Tell your friends update.`,
    hasStats
      ? `${input.friendsRedeemed} friends redeemed · ${input.pendingCodes} codes waiting · ${input.claimedRewards} claimed.`
      : "No friend redemptions yet — text a few people today.",
    `Text your friends: ${sharePage}`,
    message,
    `Your link: ${shareUrl}`,
    "",
    footerText(unsub),
  ].join("\n");

  return sendEmail({
    to: input.to,
    subject: "Your weekly Tell your friends update",
    html,
    text,
    unsubscribeUrl: unsub,
  });
}

export async function sendWeeklyProgressBatch(
  emails: Array<Parameters<typeof sendWeeklyProgressEmail>[0]>,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // Resend batch is 100 max; send sequentially in chunks via individual sends for reliability
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    const results = await Promise.all(
      chunk.map((item) => sendWeeklyProgressEmail(item)),
    );
    for (const result of results) {
      if (result.ok) sent += 1;
      else failed += 1;
    }
  }

  return { sent, failed };
}
