const express = require("express");
const { adminLogin, renderLogin } = require("../controllers/adminController");
const router = express.Router();

// Route definitions
// router.route("/").get(renderLogin); // Matches GET /admin-login
router.route("/").post(adminLogin); // Matches POST /admin-login

module.exports = router;
