const express = require('express');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- 1. CORS CONFIGURATION ---
// Explicitly allowing your Vercel URL to prevent security blocks
app.use(cors({
  origin: "https://med-voice-triage-pro.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true
}));

// FIXED: The new syntax for wildcard pre-flight handling
app.options('(.*)', cors()); 

app.use(express.json());

// --- 2. STORAGE & DATABASE ---
const upload = multer({ storage: multer.memoryStorage() });

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

// Health Check
app.get('/', (req, res) => {
  res.status(200).send('MedVoice Backend is Alive and Healthy!');
});

// Triage API
app.post('/api/triage', upload.single('audio'), async (req, res) => {
  console.log("📥 Incoming Request to /api/triage");
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file" });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const audioPart = {
      inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype }
    };

    const prompt = `Analyze patient symptoms. Return ONLY JSON: {"severity": "Low"|"Medium"|"High", "reasoning": "...", "department": "..."}`;

    const result = await model.generateContent([prompt, audioPart]);
    const cleanedJson = result.response.text().replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(cleanedJson);

    await new Triage(analysis).save();
    console.log("✅ Analysis Saved:", analysis.severity);
    res.json(analysis);

  } catch (error) {
    console.error("❌ Triage Error:", error.message);
    res.status(500).json({ error: "Analysis failed", details: error.message });
  }
});

// --- 5. SERVER START ---
// Render automatically provides a PORT environment variable (usually 10000)
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});