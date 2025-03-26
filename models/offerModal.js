const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
  offerPercentage: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product", // Reference to the Product model
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Offer = mongoose.model("Offer", offerSchema);

module.exports = Offer;
