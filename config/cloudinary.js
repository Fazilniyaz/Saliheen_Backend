// config/cloudinary.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for user avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "saliheen-perfumes/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [
      {
        width: 200,
        height: 200,
        crop: "fill",
        gravity: "face",
      },
    ],
    public_id: (req, file) => `user_${Date.now()}`,
  },
});

// Storage for product images
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "saliheen-perfumes/products",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [
      {
        width: 800,
        height: 800,
        crop: "limit",
      },
    ],
    public_id: (req, file) => `product_${Date.now()}`,
  },
});

// Create multer upload instances
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

const uploadProduct = multer({
  storage: productStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Helper function to delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log("Image deleted from Cloudinary:", result);
    return result;
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw error;
  }
};

// Helper function to extract public_id from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  // Extract public_id from Cloudinary URL
  // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image_id.jpg
  const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
  return matches ? matches[1] : null;
};

module.exports = {
  cloudinary,
  uploadAvatar,
  uploadProduct,
  deleteImage,
  getPublicIdFromUrl,
};
