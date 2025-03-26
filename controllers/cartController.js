const express = require("express");
const router = express.Router();
const Cart = require("../models/cartModal");
const Watch = require("../models/productModal");
const catchAsyncError = require("../middleware/catchAsyncError");

exports.addItemIncart = catchAsyncError(async (req, res, next) => {
  try {
    const { itemName, userId, productId, quantity, type, overallPrice } =
      req.body;

    // Find the product to check stock and get images
    const product = await Watch.findById(productId);
    console.log("product Stock", product.stock);
    console.log("quantity", quantity);
    console.log("type", type);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (quantity > product.stock) {
      return res.status(409).json({ message: "Insufficient stock available" });
    }

    if (
      type != "attar" &&
      type != "perfume" &&
      type != "Attar" &&
      type != "Perfume"
    ) {
      return res
        .status(400)
        .json({ message: "Invalid Type or Specaify your Type" });
    }

    // Check if the item is already in the cart
    let cartItem = await Cart.findOne({ userId, productId });
    // if (cartItem && cartItem.quantity + quantity > product.stock) {
    if (cartItem && quantity > product.stock) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient stock available" });
    }
    if (cartItem) {
      cartItem.quantity = quantity;
    } else {
      cartItem = new Cart({
        itemName,
        userId,
        productId,
        quantity,
        stock: product.stock,
        finalPrice: overallPrice,
      });
    }

    await cartItem.save();

    // Include product images in the response
    res.status(201).json({
      message: "Item added to cart",
      cartItem: {
        ...cartItem._doc,
        images: product.images, // Add the images from the product
        price: product.price, // Optionally include the price or other details
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// // Update cart item
// exports.updateItemInCart = catchAsyncError(async (req, res, next) => {
//   try {
//     const { quantity } = req.body;

//     const cartItem = await Cart.findById(req.params.id);
//     if (!cartItem)
//       return res.status(404).json({ message: "Cart item not found" });

//     const product = await Watch.findById(cartItem.productId);
//     if (quantity > product.stock) {
//       return res.status(400).json({ message: "Insufficient stock available" });
//     }

//     cartItem.quantity = quantity;
//     await cartItem.save();

//     res.status(200).json({ message: "Cart item updated", cartItem });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// Delete cart item
exports.deleteItemInCart = catchAsyncError(async (req, res, next) => {
  try {
    const cartItem = await Cart.findById(req.params.id);
    if (!cartItem)
      return res.status(404).json({ message: "Cart item not found" });

    await cartItem.deleteOne();
    res.status(200).json({ message: "Cart item deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fetch all cart items for a user
exports.getAllCartItemsBySingleUser = catchAsyncError(
  async (req, res, next) => {
    try {
      const cartItems = await Cart.find({ userId: req.params.userId }).populate(
        "productId"
      );

      const summary = cartItems.reduce(
        (acc, item) => {
          acc.totalAmount +=  item.finalPrice; // Assuming `price` is in product data
          acc.totalProducts += item.quantity;
          return acc;
        },
        { totalAmount: 0, totalProducts: 0 }
      );

      res.status(200).json({ cartItems, summary });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

exports.updateCartItemPrice = catchAsyncError(async (req, res, next) => {
  try {
    const { id } = req.params; // Cart item ID from URL parameter
    const { price } = req.body; // Price field from the request body

    // Validate if price is provided
    if (!price) {
      return res.status(400).json({ message: "Price is required to update" });
    }

    // Find the cart item by its ID
    const cartItem = await Cart.findById(id);
    if (!cartItem)
      return res.status(404).json({ message: "Cart item not found" });

    // Update the price of the cart item
    // cartItem.productId.price = price;
    cartItem.couponPrice = price;

    // Save the updated cart item
    await cartItem.save();

    res.status(200).json({
      message: "Cart item price updated successfully",
      cartItem,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
