// const { isLuhnNumber } = require("validator");
const catchAsyncError = require("../middleware/catchAsyncError");
const Cart = require("../models/cartModal");
const Order = require("../models/orderModal");
const Watch = require("../models/productModal");
const User = require("../models/userModal");
const Errorhandler = require("../utils/errorHandler");

exports.newOrder = catchAsyncError(async (req, res, next) => {
  console.log(req.body);
  const {
    orderItems,
    shippingInfo,
    shippingPrice,
    paymentInfo,
    totalPrice,
    itemPrice,
    taxPrice,
  } = req.body;

  // Iterate through orderItems and update stock for each product
  for (const item of orderItems) {
    const product = await Watch.findById(item.product);

    if (!product) {
      return next(
        new Errorhandler(`Product not found with ID: ${item.product}`, 404)
      );
    }

    // Check if stock is sufficient
    if (product.stock < item.quantity) {
      return next(
        new Errorhandler(`Insufficient stock for ${product.name}`, 401)
      );
    }

    // Deduct quantity from stock
    product.stock -= item.quantity;

    // Save updated product
    await product.save({ validateBeforeSave: false });
  }

  // Create the order
  const order = await Order.create({
    orderItems,
    shippingInfo,
    shippingPrice,
    paymentInfo,
    totalPrice,
    itemPrice,
    taxPrice,
    paidAt: Date.now(),
    user: req.user.id,
  });
  await Cart.deleteMany({ userId: req.user.id });

  res.status(200).json({ success: true, order });
});

exports.getSingleOrder = catchAsyncError(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (!order) {
    return next(
      new Errorhandler(`Order not found with this id :${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    order,
  });
});

exports.myOrders = catchAsyncError(async (req, res, next) => {
  console.log("hii");
  const orders = await Order.find({ user: req.user.id });
  res.status(200).json({
    success: true,
    orders,
  });
});

exports.orders = catchAsyncError(async (req, res, next) => {
  const orders = await Order.find();
  let totalAmount = 0;
  orders.forEach((order) => {
    totalAmount += order.totalPrice;
  });
  res.status(200).json({
    success: true,
    orders,
    totalAmount,
  });
});
exports.ordersForSalesReport = catchAsyncError(async (req, res, next) => {
  const { filterBy, startDate, endDate } = req.query;

  let query = { orderStatus: "Delivered" };

  if (filterBy === "custom" && startDate && endDate) {
    query.deliveredAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  } else {
    let start = new Date();

    if (filterBy === "daily") {
      start.setHours(0, 0, 0, 0);
      query.deliveredAt = { $gte: start };
    } else if (filterBy === "weekly") {
      const weekDay = start.getDay();
      start.setDate(start.getDate() - weekDay);
      start.setHours(0, 0, 0, 0);
      query.deliveredAt = { $gte: start };
    } else if (filterBy === "monthly") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      query.deliveredAt = { $gte: start };
    } else if (filterBy === "yearly") {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      query.deliveredAt = { $gte: start };
    }
  }

  const deliveredOrders = await Order.find(query);

  let totalAmount = 0;
  deliveredOrders.forEach((order) => {
    totalAmount += order.totalPrice;
  });

  res.status(200).json({
    success: true,
    orders: deliveredOrders,
    totalAmount,
  });
});

exports.updateOrder = catchAsyncError(async (req, res, next) => {
  const orders = await Order.findById(req.params.id);

  if (!orders) {
    return next(new Errorhandler("Order not found", 404));
  }

  if (orders.orderStatus === "Delivered") {
    return next(new Errorhandler("Order has already been delivered", 400));
  }

  orders.orderItems.forEach(async (orderItem) => {
    await updateStock(orderItem.product, orderItem.quantity);
  });

  orders.orderStatus = req.body.orderStatus;
  orders.deliveredAt = req.body.orderStatus === "Delivered" ? Date.now() : null;

  await orders.save({ validateBeforeSave: false }); // Skip schema validation for this save

  res.status(200).json({
    success: true,
    message: "Order updated successfully",
  });
});

async function updateStock(productId, quantity) {
  const product = await Watch.findById(productId);
  product.stock = product.stock - quantity;
  product.save({ validateBeforeSave: false });
}

exports.deleteOrder = catchAsyncError(async (req, res, next) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) {
    new Errorhandler(`Order not found with this id ${req.params.id}`, 404);
  }
  // await order.remove();
  res.status(200).json({
    success: true,
  });
});

exports.handleReturnOrCancelledOrders = async (req, res) => {
  try {
    const { type, decision, user, order } = req.body;

    if (!type || !decision || !user || !order) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the order by ID
    const orderDetails = await Order.findById(order);

    if (decision == "Return" && orderDetails.orderStatus !== "Delivered") {
      return res
        .status(400)
        .json({ message: "This product was not delivered" });
    }

    const users = await User.findById(user);

    if (
      decision == "Cancel" &&
      orderDetails.orderStatus !== "Shipped" &&
      orderDetails.orderStatus !== "Processing"
    ) {
      return res
        .status(404)
        .json({ message: "Delivered product Cannot be Cancelled" });
    }
    if (!orderDetails) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if the order belongs to the user
    // if (orderDetails.user.toString() !== user) {
    //   return res.status(403).json({ message: "Unauthorizedjj access" });
    // }

    // Update order status based on decision
    orderDetails.orderStatus = decision === "Return" ? "Returned" : "Cancelled";

    // Update paymentInfo status
    orderDetails.paymentInfo.status = "refunded";

    // Adjust stock for each product in the order
    for (let item of orderDetails.orderItems) {
      const product = await Watch.findById(item.product);

      if (!product) {
        return res.status(404).json({
          message: `Product with ID ${item.product} not found`,
        });
      }

      console.log("product Stock before", product.stock);
      product.stock += item.quantity;
      console.log("product Stock after", product.stock);

      // Increment the stock by the quantity in the order
      // if (item.quantity < 0) {
      //   item.quantity *= -1;
      // }
      // if (product.stock < 0) {
      //   product.stock *= -1;
      // }
      // console.log("productStock- Before :", product.stock);
      // let stock = product.stock + item.quantity;
      // product.stock = stock;

      console.log("productStock- After :", product.stock);

      console.log("Quantity changed");

      // Save the updated product
      await product.save();
    }

    // Save the updated order
    await orderDetails.save();

    // if (decision == "Cancel" && type == "Online Payment") {
    //   console.log(decision, type, "Refunded");
    //   user.wallet += orderDetails.totalPrice;
    // }
    // if (decision == "Return" && type == "Online Payment") {
    //   user.wallet += orderDetails.totalPrice;
    // }
    // if (decision == "Return" && type == "Cash On Delivery") {
    //   user.wallet += orderDetails.totalPrice;
    // }

    if (decision !== "Cancel" || type !== "Cash On Delivery") {
      users.wallet += orderDetails.totalPrice;
      console.log("price added to wallet");
      await users.save();
    }

    // Send the total price in the response
    res.status(200).json({
      success: true,
      message: `${decision} successful`,
      totalPrice: orderDetails.totalPrice,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.handleWallet = async (req, res) => {
  const { reducingAmountFromWallet } = req.body;
  console.log(reducingAmountFromWallet);
  const user = await User.findById(req.user.id);
  console.log(user.wallet);
  let walletAmount = Number(user.wallet) - Number(reducingAmountFromWallet);
  console.log(walletAmount);
  user.wallet = Number(walletAmount.toFixed(2));
  await user.save();

  return res.status(200).json({ success: true, user });
};

exports.countOrders = async (req, res) => {
  try {
    const orderCount = await Order.countDocuments(); // Counts all orders in the collection
    res.status(200).json({
      success: true,
      orderCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to count orders",
      error: error.message,
    });
  }
};

exports.getTopSellingStats = async (req, res) => {
  try {
    // Fetch all orders
    const orders = await Order.find();

    const productSales = {}; // To track product sales by productId
    const categorySales = {}; // To track sales by category
    const brandSales = {}; // To track sales by brand

    // Iterate through each order to accumulate product sales
    orders.forEach((order) => {
      order.orderItems.forEach((item) => {
        const productId = item.product;
        const quantity = item.quantity;

        // Track product sales
        productSales[productId] = (productSales[productId] || 0) + quantity;
      });
    });

    // Fetch product details for the sold products
    const productIds = Object.keys(productSales);
    const products = await Watch.find({ _id: { $in: productIds } });

    products.forEach((product) => {
      const productId = product._id.toString();
      const quantity = productSales[productId];

      // Track category sales
      categorySales[product.category] =
        (categorySales[product.category] || 0) + quantity;

      // Track brand sales
      brandSales[product.brand] = (brandSales[product.brand] || 0) + quantity;
    });

    // Helper function to sort and get top N items
    const getTopItems = (data, topN) => {
      return Object.entries(data)
        .sort(([, a], [, b]) => b - a)
        .slice(0, topN)
        .map(([key, value]) => ({ key, value }));
    };

    // Get top 5 products
    const topProducts = getTopItems(productSales, 5).map(({ key, value }) => ({
      product: products.find((product) => product._id.toString() === key),
      quantitySold: value,
    }));

    // Get top 5 categories
    const topCategories = getTopItems(categorySales, 5);

    // Get top 3 brands
    const topBrands = getTopItems(brandSales, 3);

    // Send the response
    res.status(200).json({
      success: true,
      data: {
        topProducts,
        topCategories,
        topBrands,
      },
    });
  } catch (error) {
    console.error("Error fetching top-selling stats:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
