const catchAsyncError = require("../middleware/catchAsyncError");
const User = require("../models/userModal");
const Errorhandler = require("../utils/errorHandler");
const sendToken = require("../utils/jwt");
const sendEmail = require("../utils/email");
const crypto = require("crypto");

//User Registration - http://localhost:8000/api/v1/register
exports.registerUser = catchAsyncError(async (req, res, next) => {
  const { name, email, password, contact } = req.body;

  console.log(req.body);

  // Regular expression for password validation
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (false) {
    return next(
      new Errorhandler(
        "Password must be at least 8 characters long and include one uppercase letter, one number, and one special character.",
        400
      )
    );
  }

  if (contact.length !== 10) {
    return next(new Errorhandler("Contact number must be of 10 digits", 400));
  }

  let avatar;

  let BASE_URL = process.env.BACKEND_URL.trim();
  if (process.env.NODE_ENV.trim() === "production") {
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
    return next(new Errorhandler("Please enter all the credintials", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new Errorhandler("Invalid credintials", 401));
  }

  if (user.blocked) {
    return next(new Errorhandler("User is blocked", 403)); // User is blocked
  }

  if (!(await user.isValidPassword(password))) {
    return next(new Errorhandler("Invalid credintials", 401));
  }

  sendToken(user, 201, res);
});

exports.googleSignIn = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new Errorhandler("Please enter all the credintials", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  console.log(user);

  if (!user) {
    return next(new Errorhandler("Invalid credintials", 401));
  }

  if (user.blocked) {
    return next(new Errorhandler("User is blocked", 403)); // User is blocked
  }

  sendToken(user, 201, res);
});

// Controller for checking email existence
exports.checkEmailExistence = catchAsyncError(async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if the email already exists in the database
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(200).json({
        success: false,
        message: "Email is already registered",
      });
    }

    // If email does not exist, return success
    return res.status(200).json({
      success: true,
      message: "Email is available for registration",
    });
  } catch (error) {
    // Handle server errors
    console.error("Error checking email:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

//User Logout - {{base_url}}/api/v1/logout
exports.logoutUser = (req, res, user) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  res.status(200).json({
    sucess: true,
    message: "Logged out !",
  });
};

//Forgot Password = {{base_url}}/api/v1/password/forgot
exports.forgotPassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new Errorhandler("user not found", 404));
  }
  const resetToken = user.getResetToken();
  await user.save({ validationBeforeSave: false });
  let BASE_URL = process.env.FRONTEND_URL.trim();
  if (process.env.NODE_ENV.trim() === "production") {
    BASE_URL = `${req.protocol}://${req.get("host")}`;
  }

  const resetUrl = `${BASE_URL}/password/reset/${resetToken}`;
  var message = `Your password reset url is as follow\n\n${resetUrl}\n\n If you have not requested then Ignore it.`;

  try {
    sendEmail({
      email: user.email,
      subject: "ChronoCraft password link",
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
    return next(new Errorhandler(error.message), 500);
  }
});

//Reset Password Link - {{base_url}}/api/v1/password/reset/b23426294b9b8bd188ec165209207efb678bb02a
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
    return next(new Errorhandler("Password reset link expired"));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  await user.save({ validateBeforeSave: false });
  sendToken(user, 201, res);
});

//getProfile - api/v1/myProfile
exports.getUserProfile = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user,
  });
});

// Password change By User- api/v1/password/change
exports.changepassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");
  if (!(await user.isValidPassword(req.body.oldPassword))) {
    return next(new Errorhandler("Old password is incorrect", 401));
  }

  user.password = req.body.password;
  await user.save();
  res.status(200).json({ success: true });
});

//Updating user's details By User - /api/v1/update
exports.updateProfile = catchAsyncError(async (req, res, next) => {
  let newUserData = {
    name: req.body.name,
    email: req.body.email,
  };

  let avatar;

  let BASE_URL = process.env.BACKEND_URL.trim();
  if (process.env.NODE_ENV.trim() === "production") {
    BASE_URL = `${req.protocol}://${req.get("host")}`;
  }

  if (req.file) {
    avatar = `${BASE_URL}/uploads/user/${req.file.originalname}`;
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
      new Errorhandler(`User not found with this id : ${req.params.id}`)
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
  console.log(user);
  if (!user) {
    return next(
      new Errorhandler(`user not found with this id : ${req.params.id}`)
    );
  }
  res.status(200).json({
    success: true,
  });
});

exports.blockUser = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new Errorhandler("User not found", 404));
  }

  // Only admin can block a user
  if (user.role === "admin") {
    return next(new Errorhandler("Admin cannot be blocked", 400));
  }

  user.blocked = true; // Block the user
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

  // Only admin can unblock a user
  if (user.role === "admin") {
    return next(
      new Errorhandler("Admin cannot be unblocked by this route", 400)
    );
  }

  user.blocked = false; // Unblock the user
  await user.save();

  res.status(200).json({
    success: true,
    message: "User unblocked successfully",
  });
});

// const sendOtp = require("../utils/otp"); // Utility to send OTP (you can use nodemailer or similar)

// Store OTP and expiration time
exports.sendOtp = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;

  // Check if email is provided
  if (!email) {
    return next(new Errorhandler("Email is required", 400));
  }

  // Check if email already exists in the database
  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new Errorhandler("Email is already registered", 400));
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

  process.env.LAST_SEND_OTP = otp;
  process.env.LAST_SEND_EMAIL = email;

  // Save the OTP and expiry to the database
  // await User.updateOne({ email }, { otp, otpExpiry }, { upsert: true }); // Create new user if not exists

  // Send the OTP email
  try {
    sendEmail({
      email: email,
      subject: "ChronoCraft Validation",
      message: `Here is Your OTP for your ChronoCraft registration ${otp}`,
    });
    res.status(200).json({
      success: true,
      message: `OTP sent to ${email}`,
      helo: process.env.LAST_SEND_OTP,
      otp,
    });
  } catch (error) {
    return next(new Errorhandler(error.message), 500);
  }
});

exports.verifyOtp = catchAsyncError(async (req, res, next) => {
  const { email, otp } = req.body;
  console.log(email, process.env.LAST_SEND_EMAIL);
  console.log(otp, process.env.LAST_SEND_OTP);

  if (
    email === process.env.LAST_SEND_EMAIL.trim() &&
    otp == process.env.LAST_SEND_OTP.trim()
  ) {
    res.status(200).send({
      success: true,
      message: "Successfully Verified!",
    });
    process.env.LAST_SEND_EMAIL = null;
    process.env.LAST_SEND_OTP = null;
  } else {
    res.status(400).send({
      success: false,
      message: "Invalid OTP",
    });
  }
});

// In your backend routes or controllers
exports.getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you have middleware to authenticate and attach user ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ wallet: user.wallet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.countUsers = async (req, res) => {
  try {
    const userCount = await User.countDocuments(); // Counts all users in the collection
    res.status(200).json({
      success: true,
      userCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to count users",
      error: error.message,
    });
  }
};
