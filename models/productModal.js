const mongoose = require("mongoose");

// Define the Watch Schema
const watchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter the watch name!"],
    trim: true,
    maxLength: [100, "Watch name cannot exceed 100 characters"],
  },
  // price: {
  //   type: Number,
  //   required: true,
  // },
  price3mlAttar: {
    type: Number,
    required: true,
    default: 0.0,
  },
  price6mlAttar: {
    type: Number,
    required: true,
    default: 0.0,
  },
  price12mlAttar: {
    type: Number,
    required: true,
    default: 0.0,
  },
  price24mlAttar: {
    type: Number,
    required: true,
    default: 0.0,
  },
  price20mlPerfume: {
    type: Number,
    required: true,
    default: 0.0,
  },
  price50mlPerfume: {
    type: Number,
    required: true,
    default: 0.0,
  },
  price100mlPerfume: {
    type: Number,
    required: true,
    default: 0.0,
  },
  node: {
    type: String,
  },
  description: {
    type: String,
    required: [true, "Please provide a description of the watch"],
  },
  ratings: {
    type: String,
    default: 0,
  },

  ratings: {
    type: Number,
    default: 0,
  },
  images: [
    {
      image: {
        type: String,
        required: true,
      },
    },
  ],

  category: {
    type: String,
    ref: "Category", // Reference to the Category model
    required: [true, "Please specify the category"],
  },
  node: {
    type: String,
    // required: [true, "Please specify the node"],
  },
  color: {
    type: String,
    required: [false, "Please specify the node"],
  },
  type: {
    type: String,
    required: [true, "Please specify the type"],
  },
  stock: {
    type: Number,
    required: [true, "Please specify the stock quantity"],
    maxLength: [20, "Stock quantity cannot exceed 20 characters"],
  },
  numOfReviews: {
    type: Number,
    default: 0,
  },
  disabled: {
    type: Boolean,
    default: false, // new field to track user status
  },
  reviews: [
    {
      // name: {
      //   type: String,
      //   required: true,
      // },
      rating: {
        type: Number,
        required: true,
      },
      comment: {
        type: String,
        required: true,
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  features: {
    type: [String], // Array of feature descriptions
    default: [],
  },
  offers: {
    type: String, // Example: "10% off on first purchase"
  },
  releaseDate: {
    type: Date, // Optional: To indicate when the watch was released
  },
  collectionsCount: {
    type: Number, // Count of collections for statistical purposes
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
  },
  couponsApplied: {
    type: Object, // Change from Boolean to Object
    default: null, // Optional: Set a default value
  },
  couponsApplied: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      discount: { type: Number, default: 0 },
      appliedAt: { type: Date, default: Date.now }, // Optional: To track when the coupon was applied
    },
  ],
  wishList: [
    {
      type: { type: Boolean, default: false },
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create the model
const Watch = mongoose.model("Watch", watchSchema);

// Export the model
module.exports = Watch;
