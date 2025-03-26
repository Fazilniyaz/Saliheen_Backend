const express = require("express");
const app = express();
const dotenv = require("dotenv");
const errorMiddleware = require("./middleware/error");
const path = require("path");
const cookieParser = require("cookie-parser");
app.use(express.json());
console.log("App.js is being loaded");

app.use(cookieParser());

// const payment = require("./routes/paymentRoutes");

// app.use("/api/v1", payment);

dotenv.config({ path: path.join(__dirname, "config/config.env") });

// if (process.env.NODE_ENV.trim() === "production") {
//   app.use(express.static(path.join(__dirname, "../frontend-common/build")));
//   app.get("*", (req, res) => {
//     res.sendFile(
//       path.resolve(__dirname, "../frontend-common/build/index.html")
//     );
//   });
// }

app.use(errorMiddleware);

module.exports = app;
