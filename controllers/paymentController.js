const catchAsyncError = require("../middleware/catchAsyncError");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const paypal = require("paypal-rest-sdk");
exports.processPayment = catchAsyncError(async (req, res, next) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: req.body.amount,
    currency: "usd",
    description: "TEST PAYMENT",
    metadata: { integration_check: "accept_payment" },
    shipping: req.body.shipping,
  });

  res.status(200).json({
    success: true,
    client_secret: paymentIntent.client_secret,
  });
});
exports.sendStripeApi = catchAsyncError(async (req, res, next) => {
  console.log(process.env.STRIPE_API_KEY);
  res.status(200).json({
    stripeApiKey: process.env.STRIPE_API_KEY,
  });
});

paypal.configure({
  mode: "sandbox", // or "live"
  client_id: process.env.PAYPAL_CLIENT_KEY,
  client_secret: process.env.PAYPAL_SECRET_KEY,
});
exports.payProduct = catchAsyncError(async (req, res, next) => {
  try {
    const totalAmount = req.body.amount.toFixed(2);
    const shippingAddress = {
      recipient_name: "John Doe",
      line1: req.body.shipping.address,
      city: req.body.shipping.city,
      country_code: "IN", // Update based on the country
      postal_code: req.body.shipping.postalCode,
      state: req.body.shipping.state,
      phone: req.body.shipping.phoneNo,
    };

    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: "http://localhost:3000/order/success",
        cancel_url: "http://localhost:3000/",
      },
      transactions: [
        {
          amount: {
            currency: "USD",
            total: totalAmount,
          },
          description: "Host best team ever",
          item_list: {
            shipping_address: shippingAddress,
          },
        },
      ],
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
        console.error("PayPal Error:", error.response);
        throw new Error(`PayPal payment creation failed: ${error.message}`);
      } else {
        const approvalUrl = payment.links.find(
          (link) => link.rel === "approval_url"
        );
        if (approvalUrl) {
          return res.redirect(approvalUrl.href);
        } else {
          return res.status(500).json({
            message: "Approval URL not found in PayPal response",
          });
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});
