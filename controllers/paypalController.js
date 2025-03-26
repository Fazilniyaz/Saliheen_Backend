const catchAsyncError = require("../middleware/catchAsyncError");
const Errorhandler = require("../utils/errorHandler");

async function fetchGot() {
  return await import("got");
}

const getAccessToken = async () => {
  try {
    const got = await fetchGot();
    const response = await got.default.post(
      `${process.env.PAYPAL_BASEURL.trim()}/v1/oauth2/token`,
      {
        form: {
          grant_type: "client_credentials",
        },
        username: process.env.PAYPAL_CLIENTID.trim(),
        password: process.env.PAYPAL_SECRET.trim(),
      }
    );

    console.log(response.body);
    // cache the access tokens
    const data = JSON.parse(response.body);
    const newAccessToken = data.access_token;
    return newAccessToken;
  } catch (err) {
    throw new Error(err);
    new Errorhandler(`${err}`, 400);
  }
};
exports.createOrder = catchAsyncError(async (req, res, next) => {
  async function fetchGot() {
    return await import("got");
  }
  try {
    const got = await fetchGot();
    const accessToken = await getAccessToken();

    const response = await got.default.post(
      `${process.env.PAYPAL_BASEURL.trim()}/v2/checkout/orders`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        json: {
          intent: "CAPTURE",
          purchase_units: [
            {
              items: [
                {
                  name: "Volatility Grid",
                  description:
                    "Interactive volatilities dashboard for cryptocurrencies.",
                  quantity: "1",
                  unit_amount: {
                    currency_code: "USD",
                    value: "50.00",
                  },
                },
              ],
              amount: {
                currency_code: "USD",
                value: "50.00",
                breakdown: {
                  item_total: {
                    currency_code: "USD",
                    value: "50.00",
                  },
                },
              },
            },
          ],

          payment_source: {
            paypal: {
              experience_context: {
                payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
                payment_method_selected: "PAYPAL",
                brand_name: "DekayHub - Volatility Grid",
                shipping_preference: "NO_SHIPPING",
                locale: "en-US",
                user_action: "PAY_NOW",
                return_url: `${process.env.PAYPAL_REDIRECT_BASE_URL.trim()}/order/success`,
                cancel_url: `${process.env.PAYPAL_REDIRECT_BASE_URL.trim()}`,
              },
            },
          },
        },
        responseType: "json",
      }
    );
    console.log(response.body);
    const orderId = response.body?.id;
    res.status(200).json({
      orderId,
    });
  } catch (err) {
    new Errorhandler(`${err}`, 400);
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

exports.capturePayment = catchAsyncError(async (req, res, next) => {
  async function fetchGot() {
    return await import("got");
  }
  try {
    const got = await fetchGot();
    const accessToken = await getAccessToken();

    const { paymentId } = req.params;

    const response = await got.default.post(
      `${process.env.PAYPAL_BASEURL.trim()}/v2/checkout/orders/${paymentId}/capture`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        responseType: "json",
      }
    );

    const paymentData = response.body;

    if (paymentData.status !== "COMPLETED") {
      return res
        .status(400)
        .json({ error: "Paypal payment incomplete or failed." });
    }

    const email = "dekay@xyz.com";
    const daysToExtend = 30;
    const currentDate = new Date();
    const tierEndAt = new Date(
      currentDate.setDate(currentDate.getDate() + daysToExtend)
    );

    return res.status(200).json({
      message: "success",
      user: {
        email,
        tier: "pro",
        tierEndAt,
      },
    });
  } catch (err) {
    new Errorhandler(`${err}`, 400);

    res.status(500).json({ error: "Internal server error." });
  }
});
