const sendToken = (user, statusCode, res) => {
  const token = user.getJwtToken();

  const options = {
    expires: new Date(
      Date.now() + Number(process.env.COOKIE_EXPIRES_TIME) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: true, // Ensure this is set for HTTPS
    sameSite: "None", // Important for cross-origin requests
  };

  console.log(
    res.status(statusCode).cookie("token", token, options).json({
      success: true,
      token,
      user,
    })
  );
  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
    user,
  });
};

module.exports = sendToken;
