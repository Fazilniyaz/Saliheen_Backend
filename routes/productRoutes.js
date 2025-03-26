const express = require("express");

const {
  getProducts,
  newProduct,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  createReview,
  getReview,
  deleteReview,
  getAdminProducts,
  disableProduct,
  enableProduct,
  getCategories,
  createCategory,
  editCategory,
  disableCategory,
  enableCategory,
  getCategoriesByUser,
  addToWishlist,
  getUserWishlist,
  removeFromWishlist,
  getWalletBalance,
  createCoupon,
  deleteCoupon,
  getAllCoupons,
  applyCoupon,
  applyOffer,
  getOffers,
  removeOffer,
} = require("../controllers/productController");

const router = express.Router();
const multer = require("multer");
const path = require("path");
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, "..", "uploads/product"));
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    },
  }),
});

const {
  isAuthenticatedUsers,
  authorizeRoles,
} = require("../middleware/authenticate");

// router.route("/products").get(isAuthenticatedUsers, getProducts);
router.route("/products").get(getProducts);

router.route("/product/:id").get(getSingleProduct).delete(deleteProduct);

router.route("/review").put(isAuthenticatedUsers, createReview);
router.route("/review").get(getReview);
router.route("/addToWishList").post(isAuthenticatedUsers, addToWishlist);
router
  .route("/deleteProductFromWishList")
  .post(isAuthenticatedUsers, removeFromWishlist);
// router
//   .route("/getBalanceValueWallet")
//   .get(isAuthenticatedUsers, getWalletBalance);
router
  .route("/getUserWishList/:userId")
  .get(isAuthenticatedUsers, getUserWishlist);
// router.route("/review").delete(deleteReview);

//Admin Route:
router
  .route("/admin/product/new")
  .post(
    isAuthenticatedUsers,
    authorizeRoles("admin"),
    upload.array("images"),
    newProduct
  );

router
  .route("/admin/products")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), getAdminProducts);
// router
//   .route("/admin/product/:id")
//   .delete(isAuthenticatedUsers, authorizeRoles("admin"), deleteReview);

router
  .route("/admin/product/:id")
  .delete(isAuthenticatedUsers, authorizeRoles("admin"), deleteProduct);

router
  .route("/createCoupon")
  .post(isAuthenticatedUsers, authorizeRoles("admin"), createCoupon);
router
  .route("/delete/:couponId")
  .delete(isAuthenticatedUsers, authorizeRoles("admin"), deleteCoupon);
router
  .route("/coupons")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), getAllCoupons);
router.route("/applyCoupons").post(isAuthenticatedUsers, applyCoupon);

router
  .route("/admin/product/:id")
  .put(
    isAuthenticatedUsers,
    authorizeRoles("admin"),
    upload.array("images"),
    updateProduct
  );

router
  .route("/admin/product/disable/:id")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), disableProduct);
router
  .route("/admin/product/enable/:id")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), enableProduct);

router
  .route("/admin/category")
  .post(isAuthenticatedUsers, authorizeRoles("admin"), createCategory);
router
  .route("/admin/applyOffer")
  .post(isAuthenticatedUsers, authorizeRoles("admin"), applyOffer);
router
  .route("/admin/getOffers")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), getOffers);
router
  .route("/admin/removeOffer/:offerId")
  .delete(isAuthenticatedUsers, authorizeRoles("admin"), removeOffer);

// // Apply Offer
// router.post("/admin/applyOffer", productController.applyOffer);

// // Get Ongoing Offers
// router.get("/admin/getOffers", productController.getOffers);

// // Remove Offer
// router.delete("/admin/removeOffer/:offerId", productController.removeOffer);
// router.route("/category/:id/disable").patch(isAuthenticatedUsers,authorizeRoles("admin") , createCategory);
// router.route("/category").post(isAuthenticatedUsers,authorizeRoles("admin") , createCategory);

// // Route to disable a category
// router.patch("/category/:id/disable", disableCategory);

// // Route to edit a category
// router.put("/category/:id", editCategory);

// Route to get all categories
router
  .route("/admin/category")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), getCategories);
router.route("/user/category").get(getCategoriesByUser);

router
  .route("/admin/category/disable/:id")
  .patch(isAuthenticatedUsers, authorizeRoles("admin"), disableCategory);
router
  .route("/admin/category/enable/:id")
  .patch(isAuthenticatedUsers, authorizeRoles("admin"), enableCategory);

// Route to edit a category
router
  .route("/admin/category/:id")
  .put(isAuthenticatedUsers, authorizeRoles("admin"), editCategory);

module.exports = router;
