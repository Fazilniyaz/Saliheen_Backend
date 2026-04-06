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
const coupon = require("./routes/couponRoutes");

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
app.use("/api/v1", coupon);

const razorpay = new Razorpay({
  key_id: "rzp_live_QNoqNSpHzqg5ox",
  key_secret: "Kl9Sgr84FSwRgredy3IhkHxe",
});

// RAZORPAY ROUTES
app.post("/create-order", async (req, res) => {
  try {
    const { amount, shippingInfo, customerName, customerPhone, orderData } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: "Invalid amount",
        message: "Amount must be greater than 0",
      });
    }

    const options = {
      amount: amount * 100,
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

    const response = await razorpay.orders.create(options);

    if (orderData) {
      let userId = null;
      try {
        const token = req.cookies?.token;
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.id;
        }
      } catch (e) {
        // Guest checkout — no userId
      }
      pendingOrders[response.id] = { orderData, userId };
    }

    res.json({
      orderId: response.id,
      amount: response.amount,
      currency: response.currency,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: "Failed to create Razorpay order",
    });
  }
});

app.post("/verify-payment", async (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({
        status: "failure",
        message: "Missing required payment verification fields",
      });
    }

    const body = order_id + "|" + payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", "Kl9Sgr84FSwRgredy3IhkHxe")
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === signature) {
      try {
        const pending = pendingOrders[order_id];
        if (pending) {
          const { orderData, userId } = pending;
          const orderItems = orderData.orderItems || [];

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

          if (userId) {
            await Cart.deleteMany({ userId });
          }

          delete pendingOrders[order_id];

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
      res.status(400).json({
        status: "failure",
        message: "Payment verification failed - Invalid signature!",
      });
    }
  } catch (error) {
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
  console.log(`Server started on port ${PORT} in ${process.env.NODE_ENV || "development"}`);
});

process.on("unhandledRejection", (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  Server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  Server.close(() => process.exit(1));
});
