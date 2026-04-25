// =====================================================
// PROMISE WORKS – Node.js + Express Backend Server
// Features: Razorpay Payments + Nodemailer Email
// =====================================================

require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const crypto     = require("crypto");
const Razorpay   = require("razorpay");
const nodemailer = require("nodemailer");
const path       = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));   // Serve index.html & assets

// ─── Razorpay Instance ───────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── Nodemailer Transporter ──────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// ─── Verify SMTP connection on startup ───────────────
transporter.verify((err) => {
  if (err) {
    console.warn("⚠️  Email transporter not ready:", err.message);
    console.warn("   → Orders will work but confirmation emails won't send.");
    console.warn("   → Set GMAIL_USER and GMAIL_APP_PASSWORD in .env to enable emails.");
  } else {
    console.log("✅ Email transporter ready →", process.env.GMAIL_USER);
  }
});

// =====================================================
// ROUTE: Create Razorpay Order
// POST /create-order
// Body: { amount (in paise), currency, cartItems, customerName }
// =====================================================
app.post("/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", customerName = "Guest" } = req.body;

    if (!amount || isNaN(amount) || amount < 100) {
      return res.status(400).json({ success: false, error: "Invalid amount (minimum ₹1)" });
    }

    const options = {
      amount:   Math.round(amount),   // Already in paise from frontend
      currency,
      receipt:  `receipt_pw_${Date.now()}`,
      notes:    {
        store:    process.env.STORE_NAME || "Promise Works",
        customer: customerName,
      },
    };

    const order = await razorpay.orders.create(options);
    console.log(`🛒 Order created: ${order.id}  ₹${amount / 100} for ${customerName}`);

    res.json({
      success:   true,
      order_id:  order.id,
      amount:    order.amount,
      currency:  order.currency,
      key_id:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("❌ Create order error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ROUTE: Verify Payment + Send Confirmation Email
// POST /verify-payment
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature,
//         customerName, customerEmail, customerPhone, address, cartItems, totalAmount }
// =====================================================
app.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customerName,
      customerEmail,
      customerPhone,
      address,
      cartItems,
      totalAmount,
    } = req.body;

    // ── Signature Verification (security critical) ────
    const body   = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      console.warn("⚠️  Invalid payment signature for", razorpay_order_id);
      return res.status(400).json({ success: false, error: "Payment verification failed. Possible fraud attempt." });
    }

    console.log(`✅ Payment verified: ${razorpay_payment_id}  Order: ${razorpay_order_id}`);

    // ── Build items HTML for email ────────────────────
    const itemRows = (cartItems || []).map(item => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f0e9dc;">
          <strong style="color:#4a3220;">${item.name}</strong>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0e9dc;text-align:center;">
          ${item.qty}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0e9dc;text-align:right;">
          ₹${(item.price * item.qty).toLocaleString("en-IN")}
        </td>
      </tr>`).join("");

    const orderDate = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    // ── Buyer Confirmation Email ──────────────────────
    const buyerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#faf6f1;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#faf6f1">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(107,79,53,.12);">

        <!-- Header -->
        <tr><td align="center" style="background:linear-gradient(135deg,#c9a87c,#a8845a);padding:40px 30px;">
          <h1 style="margin:0;color:#ffffff;font-family:Georgia,serif;font-size:28px;letter-spacing:1px;">Promise Works</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:13px;font-style:italic;">A Personal Promise Of Love In Every Present</p>
        </td></tr>

        <!-- Thank you banner -->
        <tr><td align="center" style="padding:32px 40px 20px;">
          <div style="font-size:48px;">🎁</div>
          <h2 style="color:#4a3220;font-size:22px;margin:12px 0 6px;">Order Confirmed!</h2>
          <p style="color:#7a6352;font-size:15px;margin:0;">Thank you, <strong>${customerName}</strong>! Your handmade gift is on its way to being crafted with love.</p>
        </td></tr>

        <!-- Order details box -->
        <tr><td style="padding:0 40px;">
          <div style="background:#faf6f1;border-radius:12px;padding:20px 24px;margin-bottom:8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#7a6352;font-size:13px;padding:4px 0;">Payment ID</td>
                <td style="color:#4a3220;font-size:13px;font-weight:600;text-align:right;">${razorpay_payment_id}</td>
              </tr>
              <tr>
                <td style="color:#7a6352;font-size:13px;padding:4px 0;">Order ID</td>
                <td style="color:#4a3220;font-size:13px;text-align:right;">${razorpay_order_id}</td>
              </tr>
              <tr>
                <td style="color:#7a6352;font-size:13px;padding:4px 0;">Order Date</td>
                <td style="color:#4a3220;font-size:13px;text-align:right;">${orderDate} IST</td>
              </tr>
              ${address ? `<tr>
                <td style="color:#7a6352;font-size:13px;padding:4px 0;vertical-align:top;">Delivery Address</td>
                <td style="color:#4a3220;font-size:13px;text-align:right;">${address}</td>
              </tr>` : ""}
            </table>
          </div>
        </td></tr>

        <!-- Items table -->
        <tr><td style="padding:16px 40px 0;">
          <h3 style="color:#4a3220;font-size:15px;margin:0 0 10px;">Items Ordered</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <thead>
              <tr style="background:#f0e9dc;">
                <th style="padding:10px 14px;text-align:left;color:#6b4f35;font-size:13px;border-radius:8px 0 0 0;">Product</th>
                <th style="padding:10px 14px;text-align:center;color:#6b4f35;font-size:13px;">Qty</th>
                <th style="padding:10px 14px;text-align:right;color:#6b4f35;font-size:13px;border-radius:0 8px 0 0;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr style="background:#faf6f1;">
                <td colspan="2" style="padding:12px 14px;font-weight:700;color:#4a3220;font-size:15px;">Total Paid</td>
                <td style="padding:12px 14px;font-weight:700;color:#a8845a;font-size:17px;text-align:right;">₹${Number(totalAmount).toLocaleString("en-IN")}</td>
              </tr>
            </tfoot>
          </table>
        </td></tr>

        <!-- What next -->
        <tr><td style="padding:24px 40px;">
          <div style="background:#fff5f0;border-left:4px solid #c9a87c;border-radius:0 12px 12px 0;padding:16px 20px;">
            <p style="margin:0;color:#6b4f35;font-size:14px;font-weight:600;">📦 What happens next?</p>
            <ul style="margin:8px 0 0;padding-left:18px;color:#7a6352;font-size:13px;line-height:1.8;">
              <li>Our artisan will start crafting your order within 24 hours.</li>
              <li>We'll WhatsApp you at <strong>${customerPhone}</strong> with updates.</li>
              <li>Estimated delivery: 5–7 business days (or as agreed).</li>
            </ul>
          </div>
        </td></tr>

        <!-- Contact -->
        <tr><td align="center" style="padding:8px 40px 32px;">
          <p style="color:#7a6352;font-size:13px;margin:0;">Questions? Reach us on
            <a href="https://wa.me/918870855033" style="color:#25d366;font-weight:600;">WhatsApp</a>
            or call <strong>88708 55033</strong>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="background:#f0e9dc;padding:20px 30px;">
          <p style="margin:0;color:#a8845a;font-size:12px;">© Promise Works • Handmade with Love 🌸</p>
          <p style="margin:4px 0 0;color:#c9a87c;font-size:11px;">Instagram: @promise_works.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // ── Owner Notification Email ──────────────────────
    const ownerHtml = `
<div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;">
  <h2 style="color:#4a3220;">🛍️ New Order Received – Promise Works</h2>
  <p><strong>Customer:</strong> ${customerName}</p>
  <p><strong>Email:</strong> ${customerEmail}</p>
  <p><strong>Phone:</strong> ${customerPhone}</p>
  <p><strong>Address:</strong> ${address || "Not provided"}</p>
  <p><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
  <p><strong>Order ID:</strong> ${razorpay_order_id}</p>
  <p><strong>Total:</strong> ₹${Number(totalAmount).toLocaleString("en-IN")}</p>
  <hr/>
  <h3 style="color:#6b4f35;">Items:</h3>
  <ul style="line-height:2;">
    ${(cartItems || []).map(i => `<li>${i.name} × ${i.qty} = ₹${(i.price * i.qty).toLocaleString("en-IN")}</li>`).join("")}
  </ul>
  <p style="color:#a8845a;font-size:12px;">Sent automatically by Promise Works server • ${orderDate} IST</p>
</div>`;

    // ── Send emails ───────────────────────────────────
    const emailPromises = [];

    if (customerEmail) {
      emailPromises.push(
        transporter.sendMail({
          from:    `"${process.env.STORE_NAME || "Promise Works"}" <${process.env.GMAIL_USER}>`,
          to:      customerEmail,
          subject: `✅ Order Confirmed – Promise Works (#${razorpay_payment_id.slice(-8)})`,
          html:    buyerHtml,
        }).catch(e => console.warn("Buyer email failed:", e.message))
      );
    }

    // Send copy to store owner
    if (process.env.GMAIL_USER) {
      emailPromises.push(
        transporter.sendMail({
          from:    `"Promise Works System" <${process.env.GMAIL_USER}>`,
          to:      process.env.GMAIL_USER,
          subject: `🛍️ New Order – ${customerName} – ₹${Number(totalAmount).toLocaleString("en-IN")}`,
          html:    ownerHtml,
        }).catch(e => console.warn("Owner email failed:", e.message))
      );
    }

    await Promise.allSettled(emailPromises);

    res.json({
      success:    true,
      payment_id: razorpay_payment_id,
      order_id:   razorpay_order_id,
      message:    "Payment verified and confirmation email sent!",
    });

  } catch (err) {
    console.error("❌ Verify payment error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

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

// ─── Serve index.html for root ────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ─── Start server ─────────────────────────────────────
app.listen(PORT, () => {
  console.log("");
  console.log("╔══════════════════════════════════════╗");
  console.log("║     🌸  Promise Works Server  🌸     ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`   URL  →  http://localhost:${PORT}`);
  console.log(`   Mode →  ${process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test") ? "TEST (no real money)" : "LIVE"}`);
  console.log("");
});
