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
const jwt = require("jsonwebtoken");
const Order = require("./models/orderModal");
const Watch = require("./models/productModal");
const Cart = require("./models/cartModal");

// In-memory store: razorpayOrderId -> { orderData, userId }
const pendingOrders = {};

// Load environment variables
dotenv.config({ path: path.join(__dirname, "config/config.env") });

connectDatabase();

const app = require("./app");

// CORS Configuration
app.use(
  cors({
    origin: [
      "https://saliheenperfumes.com",
      "https://www.saliheenperfumes.com",
      "http://localhost:5173",
      "http://localhost:3000",
      "https://saliheenperfumes-zd2i.onrender.com",
      "http://saliheenperfumes.com",
      "https://api.saliheenperfumes.com",
      "https://saliheenperfumes-zd2i.onrender.com",
      "https://chrono-craft-mern-frontend-production.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

const products = require("./routes/productRoutes");
const orders = require("./routes/orderRoutes");
const address = require("./routes/addressRoutes");
const cart = require("./routes/cartRoutes");
const payment = require("./routes/paymentRoutes");
const paypal = require("./routes/paypalRoutes");

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
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
  key_id: "rzp_live_QNoqNSpHzqg5ox",
  key_secret: "Kl9Sgr84FSwRgredy3IhkHxe",
});

// RAZORPAY ROUTES - ENHANCED WITH LOGGING AND ERROR HANDLING

app.post("/create-order", async (req, res) => {
  try {
    console.log("=== CREATE ORDER REQUEST ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const { amount, shippingInfo, customerName, customerPhone } = req.body;

    // Validate required fields
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

    // Store pending order data keyed by Razorpay orderId
    if (orderData) {
      // Decode userId from JWT cookie if present
      let userId = null;
      try {
        const token = req.cookies?.token;
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.id;
        }
      } catch (e) {
        // Guest checkout - no userId
      }
      pendingOrders[response.id] = { orderData, userId };
      console.log("Stored pending order for:", response.id);
    }

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

    // Validate required fields
    if (!order_id || !payment_id || !signature) {
      console.error("Missing required fields for payment verification");
      return res.status(400).json({
        status: "failure",
        message: "Missing required payment verification fields",
      });
    }

    // Create the expected signature
    const body = order_id + "|" + payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", razorpay.key_secret)
      .update(body.toString())
      .digest("hex");

    console.log("Expected signature:", expectedSignature);
    console.log("Received signature:", signature);

    // Compare signatures
    if (expectedSignature === signature) {
      console.log("Payment verification successful!");
      console.log("Payment ID:", payment_id);
      console.log("Order ID:", order_id);
      console.log("=== END VERIFY PAYMENT ===");

      // --- Create DB Order server-side ---
      try {
        const pending = pendingOrders[order_id];
        if (pending) {
          const { orderData, userId } = pending;

          const orderItems = orderData.orderItems || [];

          // Reduce stock for each product
          for (const item of orderItems) {
            const product = await Watch.findById(item.product);
            if (product) {
              const isAttar =
                product.price3mlAttar === orderData.totalPrice ||
                product.price6mlAttar === orderData.totalPrice ||
                product.price12mlAttar === orderData.totalPrice ||
                product.price24mlAttar === orderData.totalPrice;
              const deduct = isAttar ? item.quantity : item.quantity / 2;
              product.stock = Math.max(0, product.stock - deduct);
              await product.save({ validateBeforeSave: false });
            }
          }

          const newOrder = await Order.create({
            orderItems,
            shippingInfo: orderData.shippingInfo,
            shippingPrice: orderData.shippingPrice,
            taxPrice: orderData.taxPrice,
            totalPrice: orderData.totalPrice,
            itemPrice: orderData.itemsPrice,
            paymentInfo: {
              id: payment_id,
              status: "succeeded",
              type: "RAZORPAY",
            },
            paidAt: Date.now(),
            ...(userId && { user: userId }),
          });

          // Clear user's DB cart if authenticated
          if (userId) {
            await Cart.deleteMany({ userId });
          }

          // Clean up pending order
          delete pendingOrders[order_id];

          console.log("DB Order created server-side:", newOrder._id);

          return res.json({
            status: "success",
            message: "Payment verified and order created!",
            paymentId: payment_id,
            orderId: order_id,
            dbOrderId: newOrder._id,
          });
        }
      } catch (orderErr) {
        console.error("Server-side order creation failed:", orderErr.message);
        // Fall through — frontend will still attempt order creation
      }

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

// Start the server
const PORT = process.env.PORT || 8000;
const Server = app.listen(PORT, () => {
  console.log(
    `Server started running on port ${PORT} in ${process.env.NODE_ENV || "development"
    }`
  );
});

process.on("unhandledRejection", (err) => {
  console.log(`Error : ${err.message}`);
  console.log(`Shutting down the server due to unhandled rejection`);
  Server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", (err) => {
  console.log(`Error : ${err.message}`);
  console.log(`Shutting down the server due to uncaught Errors`);
  Server.close(() => {
    process.exit(1);
  });
});
