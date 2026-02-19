const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

// Import CORRECT depuis le dossier services
const chatbotService = require('./services/ChatbotService');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 3006;

// Middlewares optimisés
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        process.env.FRONTEND_URL || 'http://localhost:5173'
    ],
    credentials: true,
    maxAge: 86400
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes de santé
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Chatbot Service Optimisé',
        llmProvider: process.env.LLM_PROVIDER || 'openrouter',
        optimizations: 'v2.0 - cache + prompts adaptatifs',
        timestamp: new Date().toISOString()
    });
});

// Tester le chatbot service directement
app.get('/test', async (req, res) => {
    try {
        const result = await chatbotService.chat('Bonjour, comment ça marche ?');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Routes API principales
app.use('/api', chatRoutes);

// Nouvelle route IA pour résumé tuteurs (intro/conclusion)
const aiTutorSummary = require('./routes/aiTutorSummary');
app.use('/api/ai', aiTutorSummary);

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({
        success: false,
        reply: "Nos serveurs répondent normalement plus vite. Veuillez réessayer.",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Route not found',
        suggestion: 'Utilisez POST /api/chat pour dialoguer'
    });
});

// Démarrer le serveur
const server = app.listen(PORT, () => {
    console.log(`🚀 Chatbot Service optimisé sur port ${PORT}`);
    console.log(`📡 LLM Provider: ${process.env.LLM_PROVIDER || 'openrouter'}`);
    console.log(`⚡ Optimisations: Cache multi-niveaux, prompts adaptatifs`);
    console.log(`🔗 RAG Service: ${process.env.RAG_SERVICE_URL || 'http://localhost:3005'}`);
});

// Arrêt gracieux
process.on('SIGTERM', () => {
    console.log('🔄 Arrêt gracieux du serveur...');
    server.close(() => {
        console.log('✅ Serveur arrêté');
        process.exit(0);
    });
});

module.exports = app;