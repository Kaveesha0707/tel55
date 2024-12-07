const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Define schema and model
const keywordSchema = new mongoose.Schema({
  username: { type: String, required: true },
  channels: [
    {
      name: { type: String, required: true },
      available: { type: Boolean, default: false },
      unavailable: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  channelcount: { type: String, default: null },
});

// Automatically update channel count before saving
keywordSchema.pre("save", function (next) {
  this.channelcount = this.channels.length.toString();
  next();
});

const Keyword = mongoose.model("Keyword", keywordSchema);

// Helper function for validating ObjectId
const isValidObjectId = mongoose.Types.ObjectId.isValid;

// Route to fetch keywords with pagination
router.get("/", async (req, res) => {
  const { page = 1, limit = 15, username } = req.query;
  try {
    let query = {};
    if (username) query.username = username;

    const totalCount = await Keyword.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const keywords = await Keyword.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .exec();

    res.json({ keywords, totalPages });
  } catch (err) {
    console.error("Error fetching keywords:", err);
    res.status(500).json({ message: "Failed to fetch keywords.", error: err.message });
  }
});

// Route to fetch keyword by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ID format." });

  try {
    const keyword = await Keyword.findById(id);
    if (!keyword) return res.status(404).json({ message: "Keyword not found." });
    res.json(keyword);
  } catch (err) {
    console.error("Error retrieving keyword:", err);
    res.status(500).json({ message: "Error retrieving keyword.", error: err.message });
  }
});

// Route to create new keyword
router.post("/", async (req, res) => {
  const { username, channels } = req.body;

  // Validate input
  if (!username || !Array.isArray(channels) || channels.length === 0) {
    return res.status(400).json({ message: "Username and channels are required." });
  }

  // Validate channel structure
  const invalidChannel = channels.find(channel => !channel.name);
  if (invalidChannel) {
    return res.status(400).json({ message: "Each channel must have a valid name." });
  }

  try {
    const newKeyword = new Keyword({ username, channels });
    await newKeyword.save();
    res.status(201).json(newKeyword);
  } catch (err) {
    console.error("Error creating keyword:", err);
    res.status(500).json({ message: "Error creating keyword.", error: err.message });
  }
});

// Route to update keyword
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { channels } = req.body;

  if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ID format." });

  // Validate input
  if (!Array.isArray(channels) || channels.length === 0) {
    return res.status(400).json({ message: "Channels are required." });
  }

  // Validate channel structure
  const invalidChannel = channels.find(channel => !channel.name);
  if (invalidChannel) {
    return res.status(400).json({ message: "Each channel must have a valid name." });
  }

  try {
    const keyword = await Keyword.findById(id);
    if (!keyword) return res.status(404).json({ message: "Keyword not found." });

    // Update channels and channel count
    keyword.channels = channels;
    await keyword.save();
    res.json(keyword);
  } catch (err) {
    console.error("Error updating keyword:", err);
    res.status(500).json({ message: "Error updating keyword.", error: err.message });
  }
});

// Route to delete keyword
router.delete("/", async (req, res) => {
  const { id } = req.query;

  if (!id || !isValidObjectId(id)) return res.status(400).json({ message: "Invalid ID format." });

  try {
    const result = await Keyword.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ message: "Keyword not found." });

    res.json({ message: "Keyword deleted successfully." });
  } catch (err) {
    console.error("Error deleting keyword:", err);
    res.status(500).json({ message: "Error deleting keyword.", error: err.message });
  }
});

module.exports = router;
