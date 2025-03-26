exports.adminLogin = async (req, res, next) => {
  console.log("OK");
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and Password are required" });
  }

  try {
    console.log(process.env.ADMIN_EMAIL);
    console.log(process.env.ADMIN_PASSWORD);

    if (
      email.trim() === process.env.ADMIN_EMAIL.trim() &&
      password.trim() === process.env.ADMIN_PASSWORD.trim()
    ) {
      return res.status(200).json({ message: "Login successful" });
    } else {
      return res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
