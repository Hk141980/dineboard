// ============================================
// DineBoard — Google Gemini AI Configuration
// Powers the WhatsApp chatbot NLU engine
// ============================================

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const geminiModel = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || 'gemini-pro',
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 1024,
  },
});

module.exports = { genAI, geminiModel };
