const User = require("../models/userModal");

// Add Address
exports.addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const { addressLine, city, state, country, postalCode } = req.body;

    const newAddress = { addressLine, city, state, country, postalCode };

    user.addresses.push(newAddress);
    await user.save();

    res.status(200).json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Addresses
exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Address
exports.updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const address = user.addresses.id(req.params.id);
    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    Object.assign(address, req.body); // Update address fields
    await user.save();

    res.status(200).json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Address
exports.deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    user.addresses = user.addresses.filter(
      (address) => address._id.toString() !== req.params.id
    );
    await user.save();

    res.status(200).json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
