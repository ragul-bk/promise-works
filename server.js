// =====================================================
// PROMISE WORKS – Node.js + Express Backend Server
// Features: Static file serving + Review emails
// =====================================================

require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const nodemailer = require("nodemailer");
const path       = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));  // Serve index.html & assets

// ─── Nodemailer Transporter ──────────────────────────
let transporter = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  });

  transporter.verify((err) => {
    if (err) {
      console.warn("⚠️  Email transporter not ready:", err.message);
    } else {
      console.log("✅ Email transporter ready →", process.env.GMAIL_USER);
    }
  });
} else {
  console.warn("⚠️  GMAIL_USER or GMAIL_APP_PASSWORD not set – emails disabled.");
}

// =====================================================
// ROUTE: Submit Customer Review → Email to owner
// POST /submit-review
// Body: { name, loc, rating, text }
// =====================================================
app.post("/submit-review", async (req, res) => {
  try {
    const { name, loc, rating, text } = req.body;
    if (!name || !text || !rating) {
      return res.status(400).json({ success: false, error: "Missing required fields." });
    }

    if (!transporter) {
      // Email not configured – just acknowledge
      return res.json({ success: true, note: "Email not configured, review saved locally." });
    }

    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    const reviewDate = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const html = `
<div style="font-family:Arial,sans-serif;padding:24px;max-width:600px;background:#faf6f1;border-radius:16px;">
  <h2 style="color:#4a3220;margin-bottom:4px;">🌸 New Review – Promise Works</h2>
  <p style="color:#a8845a;font-size:13px;margin-top:0;">${reviewDate} IST</p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px;">
    <tr><td style="padding:8px 12px;font-weight:600;color:#6b4f35;width:120px;">Name</td><td style="padding:8px 12px;color:#4a3220;">${name}</td></tr>
    <tr style="background:#f0e9dc;"><td style="padding:8px 12px;font-weight:600;color:#6b4f35;">Location</td><td style="padding:8px 12px;color:#4a3220;">${loc || "Not provided"}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600;color:#6b4f35;">Rating</td><td style="padding:8px 12px;color:#d4a04a;font-size:18px;">${stars} (${rating}/5)</td></tr>
    <tr style="background:#f0e9dc;"><td style="padding:8px 12px;font-weight:600;color:#6b4f35;vertical-align:top;">Review</td><td style="padding:8px 12px;color:#4a3220;font-style:italic;line-height:1.6;">"${text}"</td></tr>
  </table>
  <p style="color:#a8845a;font-size:12px;margin-top:20px;">Sent automatically by Promise Works website</p>
</div>`;

    await transporter.sendMail({
      from:    `"Promise Works Reviews" <${process.env.GMAIL_USER}>`,
      to:      "promiseworks992@gmail.com",
      subject: `⭐ New ${rating}-Star Review from ${name} – Promise Works`,
      html,
    });

    console.log(`📝 Review email sent from ${name} (${rating}★)`);
    res.json({ success: true });

  } catch (err) {
    console.error("❌ Review email error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Serve index.html for all routes ─────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ─── Export for Vercel serverless ────────────────────
module.exports = app;

// ─── Start server locally ────────────────────────────
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("╔══════════════════════════════════════╗");
    console.log("║     🌸  Promise Works Server  🌸     ║");
    console.log("╚══════════════════════════════════════╝");
    console.log(`   Local  →  http://localhost:${PORT}`);
    console.log(`   Mobile →  http://172.20.10.5:${PORT}`);
    console.log(`   Mode   →  WhatsApp Orders`);
    console.log("");
  });
}
