MedVoice Triage Pro
This is a real-time voice-powered patient triage dashboard developed as part of my application for the Software Developer Internship at Vaiu AI. The application captures patient symptoms through voice recordings, processes the audio using the Gemini 2.5 Flash API, and automatically categorizes the medical severity.

Features
Voice-to-Triage: Direct audio-to-LLM processing for symptom analysis.

MERN Stack: Integrated Node.js and Express backend with MongoDB Atlas for data persistence.

Real-time UI: Responsive React dashboard built with Tailwind CSS and Framer Motion for interactive user feedback.

Structured AI Output: Returns JSON data including priority level (Low, Medium, High) and suggested medical department.

Tech Stack
Frontend: React.js, Tailwind CSS, Lucide React, Axios.

Backend: Node.js, Express, Multer.

Database: MongoDB Atlas.

AI Model: Google Gemini 1.5 Flash.

Setup and Installation
Clone the repository:
git clone [https://github.com/SnehaAnilK/MedVoice-Triage-Pro.git]

Backend Configuration:

cd backend

npm install

Create a .env file and add your MONGO_URI and GEMINI_API_KEY.

node index.js

Frontend Configuration:

cd frontend

npm install

npm run dev

Developed by Sneha A | PES University | SRN: PES1UG23CS582
