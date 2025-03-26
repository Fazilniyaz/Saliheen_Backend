const express = require("express");
const {
  newOrder,
  getSingleOrder,
  myOrders,
  orders,
  updateOrder,
  deleteOrder,
  handleReturnOrCancelledOrders,
  ordersForSalesReport,
  countOrders,
  getTopSellingStats,
  handleWallet,
} = require("../controllers/orderController");

const router = express.Router();

const {
  isAuthenticatedUsers,
  authorizeRoles,
} = require("../middleware/authenticate");

router.route("/order/new").post(isAuthenticatedUsers, newOrder);
router.route("/order/:id").get(isAuthenticatedUsers, getSingleOrder);
router.route("/handleWallet").post(isAuthenticatedUsers, handleWallet);

router.route("/myorders/").get(isAuthenticatedUsers, myOrders);
router
  .route("/admin/getAllOrdersCount")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), countOrders);
router
  .route("/admin/getTopSellingStats")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), getTopSellingStats);
router
  .route("/ReturnOrCancelOrder")
  .post(isAuthenticatedUsers, handleReturnOrCancelledOrders);

//Admin routes
router
  .route("/admin/orders/")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), orders);
router
  .route("/admin/salesReport")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), ordersForSalesReport);
router
  .route("/admin/order/:id")
  .put(isAuthenticatedUsers, authorizeRoles("admin"), updateOrder);
router
  .route("/admin/order/:id")
  .delete(isAuthenticatedUsers, authorizeRoles("admin"), deleteOrder);

module.exports = router;
