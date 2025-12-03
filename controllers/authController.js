const catchAsyncError = require("../middleware/catchAsyncError");
const User = require("../models/userModal");
const Errorhandler = require("../utils/errorHandler");
const sendToken = require("../utils/jwt");
const sendEmail = require("../utils/email");
const crypto = require("crypto");
const Cart = require("../models/cartModal");

//User Registration - http://localhost:8000/api/v1/register
exports.registerUser = catchAsyncError(async (req, res, next) => {
  const { name, email, password, contact } = req.body;

  // Password validation regex
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  // Uncomment if you want password validation
  // if (!passwordRegex.test(password)) {
  //   return next(
  //     new Errorhandler(
  //       "Password must be at least 8 characters long and include one uppercase letter, one number, and one special character.",
  //       400
  //     )
  //   );
  // }

  if (contact && contact.length !== 10) {
    return next(new Errorhandler("Contact number must be of 10 digits", 400));
  }

  let avatar;
  let BASE_URL = process.env.BACKEND_URL?.trim() || "";

  if (process.env.NODE_ENV?.trim() === "production") {
    BASE_URL = `${req.protocol}://${req.get("host")}`;
  }

  if (req.file) {
    avatar = `${BASE_URL}/uploads/user/${req.file.originalname}`;
  }

  const user = await User.create({
    name,
    email,
    password,
    contact,
    avatar,
  });

  sendToken(user, 201, res);
});

//User Login - http://localhost:8000/api/v1/login
exports.loginUser = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new Errorhandler("Please enter all the credentials", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new Errorhandler("Invalid credentials", 401));
  }

  if (user.blocked) {
    return next(new Errorhandler("User is blocked", 403));
  }

  if (!(await user.isValidPassword(password))) {
    return next(new Errorhandler("Invalid credentials", 401));
  }

  sendToken(user, 200, res);
});

// FIXED: Google Sign-In with proper user creation/login
exports.googleSignIn = catchAsyncError(async (req, res, next) => {
  const { email, name, avatar } = req.body;

  console.log("Google SignIn Request Body:", req.body);

  if (!email) {
    return next(new Errorhandler("Email is required", 400));
  }

  // Check if user exists
  let user = await User.findOne({ email: email });

  if (user) {
    // Existing user - Sign In
    if (user.blocked) {
      return next(new Errorhandler("User is blocked", 403));
    }

    // Update avatar if it's changed
    if (avatar && user.avatar !== avatar) {
      user.avatar = avatar;
      await user.save({ validateBeforeSave: false });
    }

    sendToken(user, 200, res);
  } else {
    // New user - Sign Up
    const randomPassword = "";

    user = await User.create({
      name: name || email.split("@")[0],
      email: email,
      password: randomPassword,
      avatar: avatar || undefined,
      contact: "0000000000", // Default contact
    });

    sendToken(user, 201, res);
  }
});

// Controller for checking email existence
exports.checkEmailExistence = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(200).json({
      success: false,
      message: "Email is already registered",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Email is available for registration",
  });
});

// CRITICAL FIX: Proper logout with cookie clearing
exports.logoutUser = (req, res, next) => {
  // Clear the token cookie with proper options
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

//Forgot Password
exports.forgotPassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new Errorhandler("User not found", 404));
  }

  const resetToken = user.getResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `https://saliheenperfumes.com/password/reset/${resetToken}`;
  const message = `Your password reset url is as follow...\n\n${resetUrl}\n\nIf you have not requested then ignore it.`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Saliheen Perfumes reset password link",
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email}`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new Errorhandler(error.message, 500));
  }
});

//Reset Password
exports.resetPassword = catchAsyncError(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordTokenExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new Errorhandler("Password reset link expired or invalid", 400)
    );
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(new Errorhandler("Passwords do not match", 400));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpire = undefined;

  await user.save({ validateBeforeSave: false });

  sendToken(user, 200, res);
});

//Get User Profile
exports.getUserProfile = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new Errorhandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// Password change By User
exports.changepassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.isValidPassword(req.body.oldPassword))) {
    return next(new Errorhandler("Old password is incorrect", 401));
  }

  user.password = req.body.password;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

//Updating user's details
exports.updateProfile = catchAsyncError(async (req, res, next) => {
  let newUserData = {
    name: req.body.name,
    email: req.body.email,
  };

  let BASE_URL = process.env.BACKEND_URL?.trim() || "";

  if (process.env.NODE_ENV?.trim() === "production") {
    BASE_URL = `${req.protocol}://${req.get("host")}`;
  }

  if (req.file) {
    const avatar = `${BASE_URL}/uploads/user/${req.file.originalname}`;
    newUserData = { ...newUserData, avatar };
  }

  const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    user,
  });
});

//Admin Routes
exports.getAllUsers = catchAsyncError(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    success: true,
    users,
  });
});

exports.getUser = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new Errorhandler(`User not found with this id: ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    user,
  });
});

exports.updateUser = catchAsyncError(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
  };

  const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    user,
  });
});

exports.deleteUser = catchAsyncError(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(
      new Errorhandler(`User not found with this id: ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

exports.blockUser = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new Errorhandler("User not found", 404));
  }

  if (user.role === "admin") {
    return next(new Errorhandler("Admin cannot be blocked", 400));
  }

  user.blocked = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User blocked successfully",
  });
});

exports.unblockUser = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new Errorhandler("User not found", 404));
  }

  user.blocked = false;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User unblocked successfully",
  });
});

// OTP functionality
exports.sendOtp = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new Errorhandler("Email is required", 400));
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new Errorhandler("Email is already registered", 400));
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store in environment (not recommended for production - use Redis or DB)
  process.env.LAST_SEND_OTP = otp;
  process.env.LAST_SEND_EMAIL = email;

  try {
    await sendEmail({
      email: email,
      subject: "Saliheen Validation",
      message: `Here is Your OTP for your Saliheen registration: ${otp}`,
    });

    res.status(200).json({
      success: true,
      message: `OTP sent to ${email}`,
    });
  } catch (error) {
    return next(new Errorhandler(error.message, 500));
  }
});

exports.verifyOtp = catchAsyncError(async (req, res, next) => {
  const { email, otp } = req.body;

  if (
    email === process.env.LAST_SEND_EMAIL?.trim() &&
    otp == process.env.LAST_SEND_OTP?.trim()
  ) {
    res.status(200).json({
      success: true,
      message: "Successfully Verified!",
    });

    // Clear stored OTP
    process.env.LAST_SEND_EMAIL = null;
    process.env.LAST_SEND_OTP = null;
  } else {
    res.status(400).json({
      success: false,
      message: "Invalid OTP",
    });
  }
});

exports.getWalletBalance = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new Errorhandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    wallet: user.wallet,
  });
});

exports.countUsers = catchAsyncError(async (req, res, next) => {
  const userCount = await User.countDocuments();

  res.status(200).json({
    success: true,
    userCount,
  });
});
