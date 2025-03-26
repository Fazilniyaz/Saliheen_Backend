const mongoose = require("mongoose");

// Define the Cart Schema
const cartSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: [true, "Please specify the item name"],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Reference to the User model
    required: [true, "User ID is required"],
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Watch", // Reference to the Watch model
    required: [true, "Product ID is required"],
  },
  finalPrice: {
    type: Number,
    default: 0,
  },
  quantity: {
    type: Number,
    required: [true, "Please specify the quantity"],
    // min: [1, "Quantity must be at least 1"],
  },
  type: {
    type: String,
    // required: [true, "Please specify the type"],
  },
  stock: {
    type: Number,
    required: [true, "Please specify the stock quantity"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create the model
const Cart = mongoose.model("Cart", cartSchema);

// Export the model
module.exports = Cart;
