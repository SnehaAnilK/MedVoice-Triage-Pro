const express = require('express');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());

// 1. Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 2. Database Schema
const TriageSchema = new mongoose.Schema({
  severity: String,
  reasoning: String,
  department: String,
  createdAt: { type: Date, default: Date.now }
});
const Triage = mongoose.model('Triage', TriageSchema);

// 3. AI Configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 4. Triage API Route
app.post('/api/triage', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const audioPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

    const prompt = `Analyze this patient's voice description of their symptoms. 
    Return ONLY a JSON object with the following keys:
    "severity": "Low" | "Medium" | "High",
    "reasoning": "short explanation of the symptoms described",
    "department": "ER" | "General Physician" | "Pharmacy"`;

    const result = await model.generateContent([prompt, audioPart]);
    const responseText = result.response.text();
    
    // Clean JSON formatting from Gemini
    const cleanedJson = responseText.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(cleanedJson);

    // 5. Save to MongoDB
    const newTriage = new Triage({
      severity: analysis.severity,
      reasoning: analysis.reasoning,
      department: analysis.department
    });
    await newTriage.save();

    res.json(analysis);

  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));