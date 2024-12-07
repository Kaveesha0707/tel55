const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();  // Load environment variables from .env file
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());  // Parse incoming JSON requests
app.use(express.static(path.join(__dirname, "public")));  // Serve static files from the 'public' folder

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Database connection error:", err.message);
    process.exit(1); // Exit process if MongoDB connection fails
  });

// API Routes
const keywordsRouter = require("./api/keywords");
app.use("/api/keywords", keywordsRouter);

// Serve the index.html file for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error handling middleware
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);  // Log detailed error stack for debugging
  res.status(500).json({ success: false, message: "Internal server error", error: err.message });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
