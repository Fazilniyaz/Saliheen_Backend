const mongoose = require("mongoose");

const connectDatabase = () => {
  mongoose
    .connect(process.env.DB_LOCAL_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then((con) => {
      console.log(
        `MongoDB Successfully connected to the ${con.connection.host}`
      );
    });
  // .catch((err) => {
  //   console.log("MongoDB connection failed :", err);
  // });
};

module.exports = connectDatabase;
