const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, "..", "uploads/user"));
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    },
  }),
});

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

router.route("/register").post(upload.single("avatar"), registerUser);
router.route("/checkEmailExistence").post(checkEmailExistence);
router.route("/login").post(loginUser);
router.route("/google/signin").post(googleSignIn);
router.route("/logout").get(logoutUser);
router.route("/password/forgot").post(forgotPassword);
router.route("/password/reset/:token").post(resetPassword);
router.route("/myProfile").get(isAuthenticatedUsers, getUserProfile);
router.route("/password/change").put(isAuthenticatedUsers, changepassword);
router.route("/getWalletBalance").get(isAuthenticatedUsers, getWalletBalance);
router
  .route("/update")
  .put(isAuthenticatedUsers, upload.single("avatar"), updateProfile);

//Admin Routes :
router
  .route("/admin/users")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), getAllUsers);
router
  .route("/admin/user/:id")
  .get(isAuthenticatedUsers, authorizeRoles("admin"), getUser);
router
  .route("/admin/user/:id")
  .put(isAuthenticatedUsers, authorizeRoles("admin"), updateUser);
router
  .route("/admin/user/:id")
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

router.route("/register/otp").post(sendOtp);
router.route("/register/otp/verify").post(verifyOtp);

module.exports = router;
