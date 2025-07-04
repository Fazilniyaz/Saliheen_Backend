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
import Blog from "./models/BlogModel.js";

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
      "http://saliheenperfumes.com",
      "https://api.saliheenperfumes.com",
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
app.use(express.static(path.join(__dirname, "public"))); // Serve static files
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/admin-login", adminRoutes); // Mount the admin routes
app.use("/api/v1", authRoutes); // Mount the admin routes
app.use("/api/v1", products);
app.use("/api/v1", orders);
app.use("/api/v1", address);
app.use("/api/v1", cart);
app.use("/api/v1", payment);
app.use("/paypal", paypal);

const razorpay = new Razorpay({
  key_id: "rzp_test_x0DSx4zqJLuGm0",
  key_secret: "kpXknJ1L4LQlrsjP9oWNpHjX",
});

app.post("/create-order", async (req, res) => {
  console.log(req.body);
  const options = {
    amount: req.body.amount * 100, // Amount in paise (e.g., 50000 paise = ₹500)
    currency: "INR",
    receipt: "order_receipt_1",
  };

  try {
    const response = await razorpay.orders.create(options);
    res.json({ orderId: response.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/verify-payment", async (req, res) => {
  const { order_id, payment_id, signature } = req.body;

  // Create the expected signature
  const body = order_id + "|" + payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", razorpay.key_secret)
    .update(body.toString())
    .digest("hex");

  // Compare signatures
  if (expectedSignature === signature) {
    res.json({ status: "success", message: "Payment verified successfully!" });
  } else {
    res
      .status(400)
      .json({ status: "failure", message: "Payment verification failed!" });
  }
});

app.post("/fazil-blogs", async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "Title and content are required." });
    }

    const blog = new Blog({ title, content });
    await blog.save();

    res.status(201).json({ message: "Blog created successfully", blog });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

app.get("/fazil-blogs", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 }); // Newest first
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

const errorMiddleware = require("./middleware/error");
app.use(errorMiddleware);
// Start the server
const PORT = process.env.PORT || 8000;
const Server = app.listen(PORT, () => {
  console.log(
    `Server started running on port ${PORT} in ${
      process.env.NODE_ENV || "development"
    }`
  );
});

// const _dirname = __dirname;
// const buildpath = path.join(_dirname, "../frontend-common/build");
// app.use(express.static(buildpath));
// app.use(
//   cors({
//     origin: "*",
//   })
// );

// if (process.env.NODE_ENV.trim() === "production") {
//   console.log("Confirmed");
//   app.use(express.static(path.join(__dirname, "../frontend-common/build")));
//   app.get("*", (req, res) => {
//     res.sendFile(
//       path.resolve(__dirname, "../frontend-common/build/index.html")
//     );
//   });
// }

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
