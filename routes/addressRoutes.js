const express = require("express");
const router = express.Router();
const path = require("path");

const { isAuthenticatedUsers } = require("../middleware/authenticate");
const {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} = require("../controllers/addressController");

router.route("/getAllAddresses").get(isAuthenticatedUsers, getAddresses);
router.route("/createAddress").post(isAuthenticatedUsers, addAddress);
router.route("/updateAddress/:id").put(isAuthenticatedUsers, updateAddress);
router.route("/deleteAddress/:id").delete(isAuthenticatedUsers, deleteAddress);

module.exports = router;
