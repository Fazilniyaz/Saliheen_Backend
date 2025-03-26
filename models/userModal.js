const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { type } = require("os");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter name"],
  },
  email: {
    type: String,
    required: [true, "Please enter  email"],
    unique: true,
    validate: [validator.isEmail, "Please enter valid email"],
  },
  contact: {
    type: String,
    required: [true, "Please enter contact number"],
  },
  password: {
    type: String,
    required: [true, "Please provide valid password"],
    maxLength: [50, "Password cannot exceed 50 characters"],
    select: false,
  },
  avatar: {
    type: String,
  },
  addresses: [
    {
      addressLine: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      postalCode: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  role: {
    type: String,
    default: "user",
  },
  resetPasswordToken: String,
  resetPasswordTokenExpire: Date,
  blocked: {
    type: Boolean,
    default: false, // new field to track user status
  },
  wallet: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_TIME,
  });
};

userSchema.methods.getResetToken = function () {
  const token = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.resetPasswordTokenExpire = Date.now() + 30 * 60 * 1000;
  return token;
};

userSchema.methods.isValidPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

let model = mongoose.model("User", userSchema);
module.exports = model;
