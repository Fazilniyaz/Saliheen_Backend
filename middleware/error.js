module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  let ServerRunner = process.env.NODE_ENV.trim();

  if (ServerRunner == "development") {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }
  if (ServerRunner == "production") {
    let message = err.message;

    let error = new Error(message);

    if (err.name == "ValidationError") {
      message = Object.values(err.errors).map((values) => values.message);
      error = new Error(message);
      err.statusCode = 400;
    }

    if (err.name == "CastError") {
      message = `Resource not found ${err.path}`;
      error = new Error(message);
    }

    if (err.code == 11000) {
      let message = `Duplicate ${Object.keys(err.keyValue)}`;
      error = new Error(message);
    }

    if (err.code == 11000) {
      let message = `Duplicate ${Object.keys(err.keyValue)}`;
      error = new Error(message);
    }

    if (err.name == "JsonWebTokenError") {
      let message = "JSON web token is invalid! Try again";
      error = new Error(message);
    }

    return res.status(err.statusCode).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
