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
router.route("/createCartItem").post(addItemIncart);
// router.route("/updateCartItem/:id").put(isAuthenticatedUsers, updateItemInCart); // Changed to 'put' and added ':id' for clarity
router.route("/deleteCartItem/:id").delete(deleteItemInCart);
router.route("/updatePrice/:id").post(updateCartItemPrice);
router
  .route("/CartProductsOfSingleUser/:userId")
  .get(getAllCartItemsBySingleUser);

module.exports = router;
