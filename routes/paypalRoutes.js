const express = require("express");
async function fetchGot() {
  return await import("got");
}
const {
  capturePayment,
  createOrder,
} = require("../controllers/paypalController");

const router = express.Router();

router.route("/capturepayment/:paymentId").get(capturePayment);
router.route("/createorder").post(createOrder);

// router.post("/createorder", createOrder);
// router.get("/capturepayment/:paymentId", capturePayment);

module.exports = router;
