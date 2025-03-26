const catchAsyncError = require("../middleware/catchAsyncError");
const Watch = require("../models/productModal");
const Errorhandler = require("../utils/errorHandler");
const ApiFeatures = require("../utils/apiFeatures");
const Category = require("../models/categoryModal");
const User = require("../models/userModal");
const Coupon = require("../models/couponModal");
const Offer = require("../models/orderModal");

//get all products - {{base_url}}/api/v1/products
exports.getProducts = async (req, res, next) => {
  const resPerPage = 4;

  let buildQuery = () => {
    return new ApiFeatures(Watch.find(), req.query).search().filter();
  };

  const filteredProductsCount = await buildQuery().query.countDocuments({});

  const totalProductsCount = await Watch.countDocuments({});

  let productsCount = totalProductsCount;

  if (filteredProductsCount !== totalProductsCount) {
    productsCount = filteredProductsCount;
  }

  const products = await buildQuery().paginate(resPerPage).query;

  res.status(200).json({
    success: true,
    count: productsCount,
    resPerPage,
    products,
  });
};

//get Single product - {{base_url}}/api/v1/product/67442b4a56169c5e00c7fb2d
exports.getSingleProduct = async (req, res, next) => {
  try {
    const product = await Watch.findById(req.params.id).populate(
      "reviews.user",
      "name email"
    );
    if (!product) {
      return next(new Errorhandler("Product Not Found", 400)); // Trigger error middleware
    }
    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error); // Pass errors to the error handler
  }
};

//Create product - api/v1/product/new
exports.newProduct = catchAsyncError(async (req, res, next) => {
  let images = [];
  let BASE_URL = process.env.BACKEND_URL.trim();
  if (process.env.NODE_ENV.trim() === "production") {
    BASE_URL = `${req.protocol}://${req.get("host")}`;
  }

  if (req.files.length > 0) {
    req.files.forEach((file) => {
      let url = `${BASE_URL}/uploads/product/${file.originalname}`;
      images.push({ image: url });
    });
  }

  req.body.images = images;

  req.body.user = req.user.id;
  const product = await Watch.create(req.body);
  res.status(201).json({
    success: true,
    product,
  });
});

//Update products - api/v1/product/Objid
exports.updateProduct = async (req, res, next) => {
  let products = await Watch.findById(req.params.id);
  console.log(req.body);

  let images = [];

  if (req.body.imagesCleared === "false") {
    images = products.images;
  }

  let BASE_URL = process.env.BACKEND_URL.trim();
  if (process.env.NODE_ENV.trim() === "production") {
    BASE_URL = `${req.protocol}://${req.get("host")}`;
  }

  if (req.files?.length > 0) {
    req.files.forEach((file) => {
      let url = `${BASE_URL}/uploads/product/${file.originalname}`;
      images.push({ image: url });
    });
  }

  req.body.images = images;

  if (!products) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }
  products = await Watch.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    products,
  });
};

//Delete Route - api/v1/product:id
exports.deleteProduct = async (req, res, next) => {
  console.log("delete");
  try {
    // Use findByIdAndDelete to delete the product directly
    const product = await Watch.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// exports.createReview = catchAsyncError(async (req, res, next) => {
//   const { productId, comment, rating } = req.body;

//   const review = {
//     user: req.user.id,
//     rating,
//     comment,
//   };

//   const product = await Watch.findById(productId);
//   console.log(product);
//   const isReviewed = product.reviews.forEach((review) => {
//     return review.user.toString() == req.user.id.toString();
//   });
//   if (isReviewed) {
//     product.reviews.find((review) => {
//       if (review.user.toString() == req.user.id.toString()) {
//         review.comment = comment;
//         review.rating = rating;
//       }
//     });
//   } else {
//     product.reviews.push(review);
//     product.numOfReviews = product.reviews.length;
//   }

//   product.ratings =
//     product.reviews.reduce((acc, values) => {
//       return review.rating + acc;
//     }, 0) / product.reviews.length;

//   await product.save({ validateBeforeSave: false });

//   res.status(200).json({ success: true });
// });

//Create Review - api/v1/review
exports.createReview = catchAsyncError(async (req, res, next) => {
  const { productId, rating, comment } = req.body;

  const review = {
    user: req.user.id,
    rating,
    comment,
  };

  const product = await Watch.findById(productId);
  //finding user review exists
  const isReviewed = product.reviews.find((review) => {
    return review.user.toString() == req.user.id.toString();
  });

  if (isReviewed) {
    //updating the  review
    product.reviews.forEach((review) => {
      if (review.user.toString() == req.user.id.toString()) {
        review.comment = comment;
        review.rating = rating;
      }
    });
  } else {
    //creating the review
    product.reviews.push(review);
    product.numOfReviews = product.reviews.length;
  }
  //find the average of the product reviews
  product.ratings =
    product.reviews.reduce((acc, review) => {
      return review.rating + acc;
    }, 0) / product.reviews.length;
  product.ratings = isNaN(product.ratings) ? 0 : product.ratings;

  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
  });
});

exports.getReview = catchAsyncError(async (req, res, next) => {
  const product = await Watch.findById(req.query.id);
  res.status(200).json({ success: true, reviews: product.reviews });
});

//Delete Review - api/v1/review
exports.deleteReview = catchAsyncError(async (req, res, next) => {
  const product = await Watch.findById(req.query.productId);

  //filtering the reviews which does match the deleting review id
  const reviews = product.reviews.filter((review) => {
    return review._id.toString() !== req.query.id.toString();
  });
  //number of reviews
  const numOfReviews = reviews.length;

  //finding the average with the filtered reviews
  let ratings =
    reviews.reduce((acc, review) => {
      return review.rating + acc;
    }, 0) / reviews.length;
  ratings = isNaN(ratings) ? 0 : ratings;

  //save the product document
  await Watch.findByIdAndUpdate(req.query.productId, {
    reviews,
    numOfReviews,
    ratings,
  });
  res.status(200).json({
    success: true,
  });
});

//get admin products - api/v1/admin/products
exports.getAdminProducts = catchAsyncError(async (req, res, next) => {
  const products = await Watch.find();
  res.status(200).send({
    success: true,
    products,
  });
});

exports.disableProduct = async (req, res, next) => {
  try {
    // Check if the product exists
    const product = await Watch.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // If disable flag is true, update the product's disabled status
    if (product.disabled == false) {
      product.disabled = true;
      await product.save();

      return res.status(200).json({
        success: true,
        message: "Product disabled successfully",
      });
    }

    res.status(400).json({
      success: false,
      message: "Invalid request",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.enableProduct = async (req, res, next) => {
  console.log("Enabvled started");
  try {
    // Check if the product exists
    const product = await Watch.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log(product.disabled);

    // If disable flag is true, update the product's disabled status
    if (product.disabled == true) {
      product.disabled = false;
      await product.save();

      return res.status(200).json({
        success: true,
        message: "Product enabled successfully",
      });
    }

    res.status(400).json({
      success: false,
      message: "Invalid request",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create({ name });
    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }); // Add `{ isActive: true }` to filter only active categories
    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getCategoriesByUser = async (req, res) => {
  try {
    const categories = await Category.find(); // Add `{ isActive: true }` to filter only active categories
    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.disableCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and disable the category
    const category = await Category.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Category disabled successfully",
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.enableCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and disable the category
    const category = await Category.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Category enabled successfully",
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Edit a category
exports.editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Find and update the category
    const category = await Category.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const { productId, userId } = req.body;

    // Validate inputs
    if (!productId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Product ID and User ID are required.",
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Find product
    const product = await Watch.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    // Check if the user has already added this product to the wishlist
    const isAlreadyInWishlist = product.wishList.some(
      (entry) => entry.user.toString() === userId
    );
    if (isAlreadyInWishlist) {
      return res.status(400).json({
        success: false,
        message: "Product is already in the user's wishlist.",
      });
    }

    // Add to wishlist
    product.wishList.push({ type: true, user: userId });

    // Save product
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${productId} added to wishlist for user ${userId}.`,
      product,
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

exports.getUserWishlist = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required." });
    }

    // Find products where the user exists in the wishList array
    const products = await Watch.find({ "wishList.user": userId });

    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found in wishlist for this user.",
      });
    }

    res.status(200).json({
      success: true,
      message: `Wishlist retrieved for user ${userId}.`,
      products,
    });
  } catch (error) {
    console.error("Error fetching user wishlist:", error);
    res.status(501).json({
      success: false,
      message: "Internallllllllll server error.",
      error: error.message,
    });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId, userId } = req.body;

    // Validate inputs
    if (!productId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Product ID and User ID are required.",
      });
    }

    // Find the product
    const product = await Watch.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // Check if the user exists in the wishlist
    const wishListEntryIndex = product.wishList.findIndex(
      (entry) => entry.user.toString() === userId
    );

    if (wishListEntryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "This product is not in the user's wishlist.",
      });
    }

    // Remove the user from the wishlist
    product.wishList.splice(wishListEntryIndex, 1);

    // Save the updated product
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${productId} removed from wishlist for user ${userId}.`,
      product,
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

exports.getWalletBalance = async (req, res, next) => {
  const user = req.user.id;
  if (!user) {
    res.status(404).json({ message: "Invalid User" });
  }

  res.status(200).json({
    success: true,
    wallet: user.wallet,
  });
};

// Create a Coupon
exports.createCoupon = async (req, res) => {
  try {
    const { code, discount, expiryDate } = req.body;

    // Validate input
    if (!code || !discount || !expiryDate) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    // Check if the coupon already exists
    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon code already exists." });
    }

    // Create the coupon
    const coupon = new Coupon({ code, discount, expiryDate });
    await coupon.save();

    res.status(201).json({
      success: true,
      message: "Coupon created successfully.",
      coupon,
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Delete a Coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;

    // Validate input
    if (!couponId) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon ID is required." });
    }

    // Find and delete the coupon
    const coupon = await Coupon.findByIdAndDelete(couponId);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Get All Coupons
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.status(200).json({
      success: true,
      coupons,
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};
exports.applyCoupon = async (req, res) => {
  try {
    const { code, userId, productId } = req.body;

    // Validate input
    if (!code || !userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Code, User ID, and Product ID are required.",
      });
    }

    // Find the coupon by code
    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found.",
      });
    }

    // Check if coupon is expired
    const currentDate = new Date();
    if (new Date(coupon.expiryDate) < currentDate) {
      return res.status(400).json({
        success: false,
        message: "Coupon has expired.",
      });
    }

    // Find the product by productId
    const product = await Watch.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // Add the user and discount to the couponsApplied array
    product.couponsApplied.push({
      user: userId,
      discount: coupon.discount,
      appliedAt: new Date(), // Optional: Timestamp for when the coupon was applied
    });

    await product.save();

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully.",
      discount: coupon.discount,
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.applyOffer = async (req, res) => {
  try {
    const { offerPercentage, category } = req.body;

    // Find products with the selected category
    const products = await Product.find({ category });

    // Calculate new price and update products
    const updatedProducts = [];
    for (let product of products) {
      const newPrice = product.price - product.price * (offerPercentage / 100);
      product.price = newPrice;
      updatedProducts.push(product.save());
    }

    // Save the offer details (could create a separate "Offer" model if needed)
    const newOffer = new Offer({
      offerPercentage,
      category,
      products: updatedProducts,
    });
    await newOffer.save();

    res
      .status(200)
      .json({ message: "Offer applied successfully", offer: newOffer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error applying offer" });
  }
};

// Get Ongoing Offers
exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.find().populate("products"); // Populate to get product details
    res.status(200).json(offers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching offers" });
  }
};

// Remove Offer
exports.removeOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    // Find and remove the offer
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    // Restore product prices (remove offer from products)
    const products = offer.products;
    for (let product of products) {
      const originalPrice = await Product.findById(product._id).select("price");
      product.price = originalPrice.price; // Assuming you keep the original price
      await product.save();
    }

    await offer.remove();
    res.status(200).json({ message: "Offer removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error removing offer" });
  }
};
