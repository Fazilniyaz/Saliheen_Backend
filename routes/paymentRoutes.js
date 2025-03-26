const express = require("express");
const { isAuthenticatedUsers } = require("../middleware/authenticate");
const {
  processPayment,
  sendStripeApi,
  payProduct,
} = require("../controllers/paymentController");
const router = express.Router();

router.route("/payment/process").post(isAuthenticatedUsers, processPayment);
router.route("/stripeapi").get(isAuthenticatedUsers, sendStripeApi);
router.route("/paymentViaPaypal").post(isAuthenticatedUsers, payProduct);

module.exports = router;
