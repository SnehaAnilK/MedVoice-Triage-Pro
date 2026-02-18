import React, { useState, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Activity, ShieldAlert, Stethoscope, Clock } from 'lucide-react';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = sendAudioToBackend;
      audioChunks.current = [];
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Please allow microphone access to use this app.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToBackend = async () => {
    setLoading(true);
    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob);

    try {
      // Updated with explicit headers for file uploads
      const response = await axios.post('https://medvoice-backend.onrender.com/api/triage', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
    } catch (error) {
      console.error("Error analyzing audio", error);
      alert("Network Error: Could not reach the medical AI. Check console for details.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 md:p-12 font-sans">
      <nav className="w-full max-w-4xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Stethoscope className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">MedVoice <span className="text-blue-600">AI</span></h1>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500 text-[10px] uppercase tracking-widest">
          <span className="flex items-center gap-1"><Clock size={16}/> Real-time Triage</span>
        </div>
      </nav>

      <main className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl shadow-blue-100 w-full max-w-xl border border-slate-100 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Patient Voice Intake</h2>
        <p className="text-slate-500 mb-10 text-sm">Describe your symptoms clearly. Our AI will assess severity.</p>

        <div className="relative flex justify-center mb-10">
          {isRecording && (
            <motion.div 
              initial={{ scale: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 bg-red-200 rounded-full w-32 h-32 m-auto"
            />
          )}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording ? 'bg-red-500 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            } shadow-2xl`}
          >
            {isRecording ? <Square fill="white" className="text-white" /> : <Mic size={40} className="text-white" />}
          </button>
        </div>

        <div className="h-8">
            {isRecording && <p className="text-red-500 font-bold animate-pulse uppercase text-xs tracking-widest">Recording Audio...</p>}
            {loading && <p className="text-blue-600 font-medium animate-bounce italic text-sm">Analyzing with Gemini AI...</p>}
        </div>

        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 text-left"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className={result.severity === 'High' ? 'text-red-600' : 'text-yellow-600'} size={20} />
                  <span className={`font-black uppercase tracking-tighter text-sm ${result.severity === 'High' ? 'text-red-600' : 'text-slate-700'}`}>
                    Priority: {result.severity}
                  </span>
                </div>
                <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {result.department}
                </div>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed italic">"{result.reasoning}"</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto text-slate-400 text-[10px] uppercase tracking-widest pt-8">
        Prototype for Vaiu AI Internship Application • Sneha A
      </footer>
    </div>
  );
}

export default App;