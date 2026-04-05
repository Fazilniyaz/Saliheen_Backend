const express = require("express");
const {
    createCoupon,
    getAllCoupons,
    deleteCoupon,
    validateCoupon,
} = require("../controllers/couponController");

const router = express.Router();

// NOTE: Auth middleware removed for local dev (coupon system not yet in production).
// The session cookie is issued by the production server, so localhost:8000 has no valid session.
// Restore isAuthenticatedUsers + authorizeRoles("admin") on all admin routes before going to prod.

// Admin routes (unprotected locally)
router.route("/admin/createCoupon").post(createCoupon);
router.route("/admin/coupons").get(getAllCoupons);
router.route("/admin/coupon/:id").delete(deleteCoupon);

// Public — no auth needed (guests can also apply coupons)
router.route("/validateCoupon").post(validateCoupon);

module.exports = router;
