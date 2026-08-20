const nodemailer = require("nodemailer");

const X_USERNAME_RE = /^@?[A-Za-z0-9_]{1,15}$/;
const EVM_WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
// Best-effort only: resets whenever the serverless instance cold-starts,
// and isn't shared across concurrent instances under load.
const requestLog = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

function isXUsername(value) {
  return typeof value === "string" && X_USERNAME_RE.test(value.trim());
}

function isXUrl(value) {
  try {
    const url = new URL(value);
    return (
      ["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(
        url.hostname.toLowerCase(),
      ) && url.pathname.length > 1
    );
  } catch {
    return false;
  }
}

function isReasonableWallet(value) {
  return typeof value === "string" && EVM_WALLET_RE.test(value.trim());
}

async function appendToSheet(record) {
  const response = await fetch(process.env.SHEETS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...record, secret: process.env.SHEETS_SECRET || "" }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error)
    throw new Error(result.error || `Sheet webhook responded ${response.status}`);
}

async function sendNotificationEmail(record) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO,
    subject: `New HOOD CABALS whitelist application: ${record.xUsername}`,
    text: [
      `X username: ${record.xUsername}`,
      `X post link: ${record.xPostLink}`,
      `Robinhood wallet: ${record.walletAddress}`,
      `Submitted: ${record.timestamp}`,
    ].join("\n"),
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (isRateLimited(ip)) {
    res
      .status(429)
      .json({ error: "Too many applications from this network. Try again later." });
    return;
  }

  const { xUsername, xPostLink, walletAddress } = req.body || {};
  if (!isXUsername(xUsername) || !isXUrl(xPostLink) || !isReasonableWallet(walletAddress)) {
    res.status(400).json({ error: "Please check the required application fields." });
    return;
  }

  if (!process.env.SHEETS_WEBHOOK_URL) {
    res.status(503).json({ error: "The cabal records store is not configured yet." });
    return;
  }

  const record = {
    xUsername: xUsername.trim(),
    xPostLink,
    walletAddress,
    timestamp: new Date().toISOString(),
  };

  try {
    await appendToSheet(record);
  } catch (error) {
    console.error("Sheet append failed:", error.message);
    res
      .status(502)
      .json({ error: "The transmission could not be recorded. Try again shortly." });
    return;
  }

  if (process.env.EMAIL_TO && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    try {
      await sendNotificationEmail(record);
    } catch (error) {
      console.error("Application email failed:", error.message);
    }
  }

  res.status(201).json({ ok: true });
};
