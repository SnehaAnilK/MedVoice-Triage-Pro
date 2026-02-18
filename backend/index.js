const express = require('express');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- 1. THE PERMANENT CORS FIX ---
// This will allow your Vercel app to talk to Render without any "Blocked" errors.
app.use(cors({
  origin: "*", // Allows any frontend to connect - safest for debugging deployment
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// --- 2. DATABASE ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

const Triage = mongoose.model('Triage', new mongoose.Schema({
  severity: String,
  reasoning: String,
  department: String,
  createdAt: { type: Date, default: Date.now }
}));

// --- 3. AI CONFIG ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 4. ROUTES ---

// Health check to verify the 404 is gone
app.get('/', (req, res) => {
  res.status(200).send('MedVoice Backend is Online and Healthy!');
});

// The main triage route
app.post('/api/triage', upload.single('audio'), async (req, res) => {
  console.log("📥 Received audio for analysis...");
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file" });

    // Use the stable 1.5-flash model name
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const audioPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype || "audio/webm",
      },
    };

    const prompt = `Analyze symptoms. Return ONLY JSON: {"severity": "Low"|"Medium"|"High", "reasoning": "...", "department": "..."}`;

    const result = await model.generateContent([prompt, audioPart]);
    const responseText = result.response.text();
    const cleanedJson = responseText.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(cleanedJson);

    await new Triage(analysis).save();
    console.log("✅ Analysis complete:", analysis.severity);
    res.json(analysis);

  } catch (error) {
    console.error("❌ Backend Error:", error.message);
    res.status(500).json({ error: "Analysis failed", details: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});