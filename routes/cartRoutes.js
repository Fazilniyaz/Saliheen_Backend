const express = require("express");
const router = express.Router();

const { isAuthenticatedUsers } = require("../middleware/authenticate");
const {
  addItemIncart,
  updateItemInCart,
  deleteItemInCart,
  getAllCartItemsBySingleUser,
  updateCartItemPrice,
} = require("../controllers/cartController");

// Define routes
router.route("/createCartItem").post(isAuthenticatedUsers, addItemIncart);
// router.route("/updateCartItem/:id").put(isAuthenticatedUsers, updateItemInCart); // Changed to 'put' and added ':id' for clarity
router
  .route("/deleteCartItem/:id")
  .delete(isAuthenticatedUsers, deleteItemInCart);
router
  .route("/updatePrice/:id")
  .post(isAuthenticatedUsers, updateCartItemPrice);
router
  .route("/CartProductsOfSingleUser/:userId")
  .get(isAuthenticatedUsers, getAllCartItemsBySingleUser);

module.exports = router;
