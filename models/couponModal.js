const mongoose = require("mongoose");

// Define the Coupon Schema
const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, "Please provide a coupon code."],
    unique: true,
    trim: true,
  },

  discount: {
    type: Number,
    required: [true, "Please specify the discount percentage."],
    min: [1, "Discount must be at least 1%."],
    max: [100, "Discount cannot exceed 100%."],
  },
  expiryDate: {
    type: Date,
    required: [true, "Please specify the expiry date for the coupon."],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Coupon = mongoose.model("Coupon", couponSchema);

// Drop stale index from a previous schema version that used "couponCode" instead of "code".
// This causes duplicate-key errors (null) because the old index still exists in MongoDB.
Coupon.collection
  .dropIndex("couponCode_1")
  .then(() => console.log("Dropped stale couponCode_1 index"))
  .catch(() => { }); // Silently ignore if index doesn't exist

module.exports = Coupon;

