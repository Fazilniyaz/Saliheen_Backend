const Razorpay = require("razorpay");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const adminRoutes = require("./routes/adminRoutes");
const connectDatabase = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "config/config.env") });

// Connect to database
connectDatabase();

const app = require("./app");

// CRITICAL FIX: Proper CORS Configuration for session management
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://saliheenperfumes.com",
      "https://www.saliheenperfumes.com",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:8000",
      "http://saliheenperfumes.com",
      "https://api.saliheenperfumes.com",
      "https://saliheenperfumes-zd2i.onrender.com",
      "https://chrono-craft-mern-frontend-production.vercel.app",
      "https://saliheenbackend.vercel.app",
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // CRITICAL: Allow cookies to be sent
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["set-cookie"], // Expose cookie headers
  maxAge: 86400, // 24 hours
};

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

const products = require("./routes/productRoutes");
const orders = require("./routes/orderRoutes");
const address = require("./routes/addressRoutes");
const cart = require("./routes/cartRoutes");
const payment = require("./routes/paymentRoutes");
const paypal = require("./routes/paypalRoutes");

// IMPORTANT: Cookie parser must come before routes
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/admin-login", adminRoutes);
app.use("/api/v1", authRoutes);
app.use("/api/v1", products);
app.use("/api/v1", orders);
app.use("/api/v1", address);
app.use("/api/v1", cart);
app.use("/api/v1", payment);
app.use("/paypal", paypal);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_QNoqNSpHzqg5ox",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "Kl9Sgr84FSwRgredy3IhkHxe",
});

// RAZORPAY ROUTES
app.post("/create-order", async (req, res) => {
  try {
    console.log("=== CREATE ORDER REQUEST ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const { amount, shippingInfo, customerName, customerPhone } = req.body;

    if (!amount || amount <= 0) {
      console.error("Invalid amount:", amount);
      return res.status(400).json({
        error: "Invalid amount",
        message: "Amount must be greater than 0",
      });
    }

    const options = {
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: `order_${Date.now()}`,
      notes: {
        customerName: customerName || "N/A",
        customerPhone: customerPhone || "N/A",
        shippingAddress: shippingInfo?.address || "N/A",
        shippingCity: shippingInfo?.city || "N/A",
        shippingState: shippingInfo?.state || "N/A",
        shippingPostalCode: shippingInfo?.postalCode || "N/A",
        shippingCountry: shippingInfo?.country || "N/A",
      },
    };

    console.log("Razorpay order options:", JSON.stringify(options, null, 2));

    const response = await razorpay.orders.create(options);

    console.log("Razorpay order created successfully:", response.id);
    console.log("=== END CREATE ORDER ===");

    res.json({
      orderId: response.id,
      amount: response.amount,
      currency: response.currency,
    });
  } catch (error) {
    console.error("=== CREATE ORDER ERROR ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("=== END ERROR ===");

    res.status(500).json({
      error: error.message,
      message: "Failed to create Razorpay order",
    });
  }
});

app.post("/verify-payment", async (req, res) => {
  try {
    console.log("=== VERIFY PAYMENT REQUEST ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const { order_id, payment_id, signature } = req.body;

    if (!order_id || !payment_id || !signature) {
      console.error("Missing required fields for payment verification");
      return res.status(400).json({
        status: "failure",
        message: "Missing required payment verification fields",
      });
    }

    const body = order_id + "|" + payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", razorpay.key_secret)
      .update(body.toString())
      .digest("hex");

    console.log("Expected signature:", expectedSignature);
    console.log("Received signature:", signature);

    if (expectedSignature === signature) {
      console.log("Payment verification successful!");
      console.log("Payment ID:", payment_id);
      console.log("Order ID:", order_id);
      console.log("=== END VERIFY PAYMENT ===");

      res.json({
        status: "success",
        message: "Payment verified successfully!",
        paymentId: payment_id,
        orderId: order_id,
      });
    } else {
      console.error("Signature mismatch - Payment verification failed");
      console.log("=== END VERIFY PAYMENT (FAILED) ===");

      res.status(400).json({
        status: "failure",
        message: "Payment verification failed - Invalid signature!",
      });
    }
  } catch (error) {
    console.error("=== VERIFY PAYMENT ERROR ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("=== END ERROR ===");

    res.status(500).json({
      status: "failure",
      message: "Payment verification error",
      error: error.message,
    });
  }
});

const errorMiddleware = require("./middleware/error");
app.use(errorMiddleware);

// IMPORTANT FOR VERCEL: Export the app for serverless
// Don't use app.listen() in Vercel - it's handled by the platform
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(
      `Server started running on port ${PORT} in ${
        process.env.NODE_ENV || "development"
      }`
    );
  });
}

// Export for Vercel
module.exports = app;
