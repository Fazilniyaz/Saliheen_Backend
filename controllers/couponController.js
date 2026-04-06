const catchAsyncError = require("../middleware/catchAsyncError");
const Coupon = require("../models/couponModal");
const Errorhandler = require("../utils/errorHandler");

// @desc    Create a new coupon (Admin)
// @route   POST /api/v1/admin/createCoupon
exports.createCoupon = catchAsyncError(async (req, res, next) => {
    const { code, discount, expiryDate } = req.body;

    if (!code || !discount || !expiryDate) {
        return next(new Errorhandler("Please provide code, discount, and expiry date", 400));
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
        return next(new Errorhandler("Coupon code already exists", 400));
    }

    const coupon = await Coupon.create({
        code: code.toUpperCase(),
        discount,
        expiryDate,
    });

    res.status(201).json({
        success: true,
        message: "Coupon created successfully!",
        coupon,
    });
});

// @desc    Get all coupons (Admin)
// @route   GET /api/v1/admin/coupons
exports.getAllCoupons = catchAsyncError(async (req, res, next) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        coupons,
    });
});

// @desc    Delete a coupon (Admin)
// @route   DELETE /api/v1/admin/coupon/:id
exports.deleteCoupon = catchAsyncError(async (req, res, next) => {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
        return next(new Errorhandler("Coupon not found", 404));
    }
    res.status(200).json({
        success: true,
        message: "Coupon deleted successfully!",
    });
});

// @desc    Validate coupon & return discounted price (Public)
// @route   POST /api/v1/validateCoupon
exports.validateCoupon = catchAsyncError(async (req, res, next) => {
    const { couponCode, totalPrice } = req.body;

    if (!couponCode || !totalPrice) {
        return next(new Errorhandler("Please provide coupon code and total price", 400));
    }

    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

    if (!coupon) {
        return next(new Errorhandler("Invalid coupon code", 400));
    }

    // Check expiry
    if (new Date(coupon.expiryDate) < new Date()) {
        return next(new Errorhandler("This coupon has expired", 400));
    }

    const discountAmount = Number(((coupon.discount / 100) * totalPrice).toFixed(2));
    const discountedPrice = Number((totalPrice - discountAmount).toFixed(2));

    res.status(200).json({
        success: true,
        message: `Coupon applied! You saved ₹${discountAmount}`,
        discountPercent: coupon.discount,
        discountAmount,
        discountedPrice,
        originalPrice: totalPrice,
    });
});