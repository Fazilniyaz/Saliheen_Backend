const products = require("../data/products.json");

const product = require("../models/productModal");

const dotenv = require("dotenv");

const connectDatabase = require("../config/database");

dotenv.config({ path: "backend/config/config.env" });

connectDatabase();

const seedProducts = async () => {
  try {
    await product.deleteMany();
    console.log("DB emptied!!");
    await product.insertMany(products);
    console.log("All the Sample products inserted into DB");
  } catch (err) {
    console.log(err.message);
  }
};
seedProducts();
