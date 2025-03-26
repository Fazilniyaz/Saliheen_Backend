const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Category name is required"],
    unique: true, // Ensures no duplicate category names
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true, // Allow enabling/disabling categories
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
