const express = require('express');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- 1. MIDDLEWARE & CORS ---
// Using origin: true allows the server to accept requests from your Vercel URL dynamically.
app.use(cors({
  origin: true, 
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Explicitly handle pre-flight requests to prevent CORS blocks on POST calls
app.options('*', cors()); 

app.use(express.json());

// --- 2. STORAGE CONFIG ---
const upload = multer({ storage: multer.memoryStorage() });

// --- 3. DATABASE CONNECTION ---
// Using a check to ensure MONGO_URI exists before trying to connect
if (!process.env.MONGO_URI) {
  console.error("❌ Error: MONGO_URI is missing from environment variables.");
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

const Triage = mongoose.model('Triage', new mongoose.Schema({
  severity: String,
  reasoning: String,
  department: String,
  createdAt: { type: Date, default: Date.now }
}));

// --- 4. AI CONFIG ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 5. ROUTES ---

// Health Check - This MUST return 200 OK for Render to consider the service "Live"
app.get('/', (req, res) => {
  res.status(200).send('Server is alive and healthy!');
});

// The Main Triage Logic
app.post('/api/triage', upload.single('audio'), async (req, res) => {
  console.log("📥 Received a triage request...");

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file received" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const audioPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

    const prompt = `Analyze this patient's symptoms from the audio. 
    Respond ONLY with a JSON object: 
    {
      "severity": "Low" | "Medium" | "High",
      "reasoning": "one sentence explanation",
      "department": "ER" | "General Physician" | "Pharmacy"
    }`;

    const result = await model.generateContent([prompt, audioPart]);
    const responseText = result.response.text();
    
    // Clean up Gemini's response to ensure it's valid JSON
    const cleanedJson = responseText.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(cleanedJson);

    // Save the record to MongoDB Atlas
    const newTriage = new Triage(analysis);
    await newTriage.save();

    console.log("✅ Triage complete and saved to DB");
    res.json(analysis);

  } catch (error) {
    console.error("❌ Backend Error:", error);
    res.status(500).json({ error: "Analysis failed", details: error.message });
  }
});

// --- 6. START SERVER ---
// Using 10000 as the default to align with Render's internal routing
const PORT = process.env.PORT || 10000; 
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});