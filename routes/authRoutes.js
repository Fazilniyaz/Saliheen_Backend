const express = require("express");
const router = express.Router();

// IMPORTANT: Replace local file upload with Cloudinary
const { uploadAvatar } = require("../config/cloudinary");

const {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  getUserProfile,
  changepassword,
  updateProfile,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  blockUser,
  sendOtp,
  verifyOtp,
  googleSignIn,
  getWalletBalance,
  unblockUser,
  checkEmailExistence,
  countUsers,
} = require("../controllers/authController");

const {
  isAuthenticatedUsers,
  authorizeRoles,
} = require("../middleware/authenticate");

// Public routes
router.route("/register").post(uploadAvatar.single("avatar"), registerUser);
router.route("/checkEmailExistence").post(checkEmailExistence);
router.route("/login").post(loginUser);
router.route("/google/signin").post(googleSignIn);
router.route("/logout").get(logoutUser);
router.route("/password/forgot").post(forgotPassword);
router.route("/password/reset/:token").post(resetPassword);
router.route("/register/otp").post(sendOtp);
router.route("/register/otp/verify").post(verifyOtp);

// Protected user routes
router.route("/myProfile").get(isAuthenticatedUsers, getUserProfile);
router.route("/password/change").put(isAuthenticatedUsers, changepassword);
router.route("/getWalletBalance").get(isAuthenticatedUsers, getWalletBalance);
router
  .route("/update")
  .put(isAuthenticatedUsers, uploadAvatar.single("avatar"), updateProfile);

// Admin routes
router
  .route("/admin/users")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), getAllUsers);

router
  .route("/admin/user/:id")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), getUser)
  .put(isAuthenticatedUsers, authorizeRoles("admin"), updateUser)
  .delete(isAuthenticatedUsers, authorizeRoles("admin"), deleteUser);

router
  .route("/admin/GetCountOfUsers")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), countUsers);

router
  .route("/admin/userBlock/:id")
  .put(isAuthenticatedUsers, authorizeRoles("admin"), blockUser);

router
  .route("/admin/userUnblock/:id")
  .put(isAuthenticatedUsers, authorizeRoles("admin"), unblockUser);

module.exports = router;
