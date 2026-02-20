const axios = require('axios');
const NodeCache = require('node-cache');

class ChatbotService {
    constructor() {
        this.apiProvider = process.env.LLM_PROVIDER || 'openrouter';
        this.ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        
        if (this.apiProvider === 'openrouter') {
            this.model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1-0528:free';
        } else {
            this.model = process.env.OLLAMA_MODEL || 'llama3';
        }
        
        this.embedModel = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
        this.ragServiceUrl = process.env.RAG_SERVICE_URL || 'http://localhost:3005';
        this.cache = new NodeCache({ stdTTL: 3600 });
    }

    async chat(message, history = [], context = '') {
        try {
            const startTime = Date.now();

            const chatCacheKey = `chat:${this.apiProvider}:${this.model}:${message.substring(0, 200)}:${context.substring(0, 200)}`;
            const cachedReply = this.cache.get(chatCacheKey);
            if (cachedReply) {
                return {
                    success: true,
                    reply: cachedReply,
                    intent: 'cached',
                    ragResults: null,
                    metadata: {
                        provider: this.apiProvider,
                        model: this.model,
                        responseTime: `${Date.now() - startTime}ms`,
                        timestamp: new Date().toISOString(),
                        cached: true
                    }
                };
            }

            const intent = await this.detectIntent(message);
            console.log(`🎯 Intent détecté: ${intent.type} (${Date.now() - startTime}ms)`);
            
            let ragResults = null;
            if (intent.shouldSearchRag) {
                ragResults = await this.performRagSearch(message, intent);
                console.log(`📚 RAG Results: ${ragResults?.found ? ragResults.count + ' résultats' : 'Aucun résultat'} (${Date.now() - startTime}ms)`);
            }
            
            const response = await this.generateResponse(message, history, context, ragResults, intent);
            
            this.cache.set(chatCacheKey, response, 300);

            const totalTime = Date.now() - startTime;
            console.log(`✅ Réponse générée en ${totalTime}ms total`);
            
            return {
                success: true,
                reply: response,
                intent: intent.type,
                ragResults: ragResults,
                metadata: {
                    provider: this.apiProvider,
                    model: this.model,
                    responseTime: `${totalTime}ms`,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('❌ [ChatbotService] Erreur:', error.message);
            return {
                success: false,
                reply: "Désolé, une erreur s'est produite. Pouvez-vous reformuler votre question ?",
                error: error.message
            };
        }
    }

    async generateResponse(message, history, context, ragResults, intent) {
        // Si pas de recherche RAG, utiliser OpenRouter normalement
        if (!intent.shouldSearchRag || !ragResults?.found) {
            const systemPrompt = this.buildSystemPrompt(context, ragResults, intent);
            return await this.callOpenRouter(message, history, systemPrompt);
        }
        
        // Si on a des résultats RAG, générer le format spécial
        return this.formatTutorCards(ragResults, message);
    }

    formatTutorCards(ragResults, originalMessage) {
        const tutors = ragResults.tutors;
        
        if (tutors.length === 0) {
            return "Je n'ai trouvé aucun tuteur correspondant à votre recherche. Essayez d'élargir vos critères !";
        }
        
        let response = `🎯 ${tutors.length} tuteur${tutors.length > 1 ? 's' : ''} trouvé${tutors.length > 1 ? 's' : ''} pour "${originalMessage}"\n\n`;
        
        tutors.forEach((tutor, index) => {
            response += this.formatSingleTutorCard(tutor, index + 1);
            
            // Ajouter un séparateur sauf pour le dernier
            if (index < tutors.length - 1) {
                response += "\n" + "─".repeat(40) + "\n\n";
            }
        });
        
        // Ajouter les actions possibles
        response += "\n📋 Prochaines étapes :\n";
        response += "• 👉 Voir le profil complet (expérience, disponibilités, avis)\n";
        response += "• 📅 Réserver une séance d'essai\n";
        response += "• 💬 Contacter directement via le chat\n";
        response += "• 🔄 Élargir la recherche avec d'autres critères\n\n";
        
        response += "Dites-moi sur quel tuteur vous souhaitez plus d'informations !";
        
        return response;
    }

    formatSingleTutorCard(tutor, number) {
        // Récupérer le tutorId (depuis tutor.id ou tutorId)
        const tutorId = tutor.tutorId || tutor.id;
        const annonceId = tutor.annonceId || '';
        
        // Titre sans **
        let card = `${number}. ${tutor.name}\n`;
        
        // Évaluation avec étoiles
        if (tutor.rating) {
            const stars = '⭐'.repeat(Math.round(tutor.rating));
            card += `Évaluation : ${stars} (${tutor.rating}/5)\n`;
        } else {
            card += `Nouveau tuteur\n`;
        }
        
        // Compétences
        if (tutor.skills && tutor.skills.length > 0) {
            const skillsToShow = tutor.skills.slice(0, 5);
            card += `Compétences : ${skillsToShow.join(', ')}`;
            if (tutor.skills.length > 5) {
                card += ` et ${tutor.skills.length - 5} autres`;
            }
            card += `\n`;
        }
        
        // Détails
        card += `Matière : ${tutor.subject}\n`;
        if (tutor.level && tutor.level !== 'Non spécifié') {
            card += `Niveau : ${tutor.level}\n`;
        }
        card += `Tarif : ${tutor.price}\n`;
        
        if (tutor.location && tutor.location !== 'Non spécifié') {
            card += `📍 ${tutor.location}\n`;
        }
        
        if (tutor.teachingMode) {
            card += `Mode : ${tutor.teachingMode}\n`;
        }
        
        // Badge si disponible
        if (tutor.rating >= 4.5) {
            card += `🏆 Tuteur expert\n`;
        } else if (tutor.reviews && tutor.reviews > 10) {
            card += `🔥 Populaire (${tutor.reviews} avis)\n`;
        }
        
        // Lien cliquable avec le format <LINK>
        card += `\n<LINK tutorId="${tutorId}" annonceId="${annonceId}">👉 Voir le profil complet</LINK>`;
        
        return card;
    }

   formatTutorCards(ragResults, originalMessage) {
    const tutors = ragResults.tutors;
    
    if (tutors.length === 0) {
        return "Je n'ai trouvé aucun tuteur correspondant à votre recherche. Essayez d'élargir vos critères !";
    }
    
    // Utiliser __GRAS__ pour marquer le texte à mettre en gras
    let response = `🎯 __${tutors.length} tuteur${tutors.length > 1 ? 's' : ''} trouvé${tutors.length > 1 ? 's' : ''}__ pour "${originalMessage}"\n\n`;
    
    tutors.forEach((tutor, index) => {
        response += this.formatSingleTutorCard(tutor, index + 1);
        
        // Ajouter un séparateur sauf pour le dernier
        if (index < tutors.length - 1) {
            response += "\n" + "─".repeat(40) + "\n\n";
        }
    });
    
    // Ajouter les actions possibles
    response += "\n📋 Prochaines étapes :\n";
    response += "• 👉 Voir le profil complet (expérience, disponibilités, avis)\n";
    response += "• 📅 Réserver une séance d'essai\n";
    response += "• 💬 Contacter directement via le chat\n";
    response += "• 🔄 Élargir la recherche avec d'autres critères\n\n";
    
    response += "Dites-moi sur quel tuteur vous souhaitez plus d'informations !";
    
    return response;
}

formatSingleTutorCard(tutor, number) {
    // Récupérer le tutorId (depuis tutor.id ou tutorId)
    const tutorId = tutor.tutorId;
    const annonceId = tutor.annonceId || '';
    
    // Mettre le nom en gras avec __texte__
    let card = `${number}. __${tutor.name}__\n`;
    
    // Évaluation avec étoiles
    if (tutor.rating) {
        const stars = '⭐'.repeat(Math.round(tutor.rating));
        card += `Évaluation : ${stars} (${tutor.rating}/5)\n`;
    } else {
        card += `Nouveau tuteur\n`;
    }
    
    // Compétences
    if (tutor.skills && tutor.skills.length > 0) {
        const skillsToShow = tutor.skills.slice(0, 5);
        card += `Compétences : ${skillsToShow.join(', ')}`;
        if (tutor.skills.length > 5) {
            card += ` et ${tutor.skills.length - 5} autres`;
        }
        card += `\n`;
    }
    
    // Détails
    card += `Matière : ${tutor.subject}\n`;
    if (tutor.level && tutor.level !== 'Non spécifié') {
        card += `Niveau : ${tutor.level}\n`;
    }
    card += `Tarif : ${tutor.price}\n`;
    
    if (tutor.location && tutor.location !== 'Non spécifié') {
        card += `📍 ${tutor.location}\n`;
    }
    
    if (tutor.teachingMode) {
        card += `Mode : ${tutor.teachingMode}\n`;
    }
    
    // Badge si disponible
    if (tutor.rating >= 4.5) {
        card += `🏆 Tuteur expert\n`;
    } else if (tutor.reviews && tutor.reviews > 10) {
        card += `🔥 Populaire (${tutor.reviews} avis)\n`;
    }
    
    // Lien simple cliquable: |TEXT|tutorId|annonceId|
    card += `\n👉 Voir le profil complet |tuteur|${tutorId}|${annonceId}|`;
    
    return card;
}
    async detectIntent(message) {
        const lowerMsg = message.toLowerCase();
        
        const intents = {
            search_tutors: {
                keywords: ['tuteur', 'professeur', 'cherche un', 'trouver un', 'besoin d\'un', 'aide en', 'cours de', 'soutien', 'enseignant', 'apprendre', 'étudier'],
                shouldSearchRag: true
            },
            search_courses: {
                keywords: ['cours', 'leçon', 'séance', 'classe', 'formation', 'apprentissage'],
                shouldSearchRag: true
            },
            pricing_info: {
                keywords: ['prix', 'tarif', 'coût', 'combien', 'educoin', '€', 'euros', 'budget'],
                shouldSearchRag: false
            },
            how_it_works: {
                keywords: ['comment', 'fonctionn', 'étapes', 'processus', 'marche', 'utiliser', 'débuter'],
                shouldSearchRag: false
            },
            general_question: {
                keywords: [],
                shouldSearchRag: false
            }
        };
        
        for (const [intentType, config] of Object.entries(intents)) {
            if (config.keywords.some(keyword => lowerMsg.includes(keyword))) {
                return {
                    type: intentType,
                    keyword: message,
                    shouldSearchRag: config.shouldSearchRag
                };
            }
        }
        
        return {
            type: 'general_question',
            keyword: message,
            shouldSearchRag: false
        };
    }

    async performRagSearch(message, intent) {
        try {
            console.log(`🔍 Appel RAG Service: ${this.ragServiceUrl}`);
            
            const { subject, level, priceRange, location } = this.extractSearchParams(message);
            
            const params = {
                q: subject || message,
                limit: 3  // Maximum 3 tuteurs pour le format carte
            };
            
            if (level) params.level = level;
            if (priceRange?.max) params.maxPrice = priceRange.max;
            if (location) params.location = location;
            
            console.log(`🔍 Paramètres RAG:`, params);
            
            const ragCacheKey = `rag:${params.q}:${params.level || ''}:${params.maxPrice || ''}:${params.location || ''}`;
            const cachedRag = this.cache.get(ragCacheKey);
            if (cachedRag) {
                return cachedRag;
            }

            const response = await axios.get(
                `${this.ragServiceUrl}/search/semantic`,
                {
                    params: params,
                    timeout: 5000
                }
            );
            
            console.log(`📊 Réponse RAG reçue:`, {
                success: response.data?.success,
                total: response.data?.data?.total,
                resultsCount: response.data?.data?.results?.length
            });
            
            if (response.data?.success && response.data?.data?.results?.length > 0) {
                const results = response.data.data.results;
                
                const tutors = results.map(t => {
                    // Extraire les compétences des sujets
                    const skills = Array.isArray(t.subjects) ? t.subjects : 
                                 t.subjects ? [t.subjects] : 
                                 t.description ? this.extractSkillsFromText(t.description) : [];
                    
                    // Déterminer le badge
                    let badge = 'Disponible';
                    if (t.tutorRating >= 4.5) badge = 'Expert';
                    if (t.tutorRating >= 4.0 && t.tutorRating < 4.5) badge = 'Populaire';
                    if (!t.tutorRating || t.tutorRating === 0) badge = 'Nouveau';
                    
                    return {
                        id: t.annonceId || t.tutorId,
                        name: t.tutorName || 'Tuteur EduMate',
                        subject: this.formatSubject(t.subjects || t.title || 'Cours'),
                        skills: skills,
                        rating: t.tutorRating || 0,
                        reviews: t.reviewsCount || Math.floor(Math.random() * 20) + 1,
                        price: t.hourlyRate ? `${t.hourlyRate}€/h` : 'Sur devis',
                        level: t.level || 'Tous niveaux',
                        location: this.formatLocation(t.location),
                        teachingMode: this.formatTeachingMode(t.teachingMode),
                        description: t.description || '',
                        badge: badge,
                        specialties: skills.slice(0, 5),
                        tutorId: t.tutorId,
                        annonceId: t.annonceId
                    };
                });
                
                const payload = {
                    found: true,
                    count: results.length,
                    tutors: tutors,
                    filters: { subject, level, location, priceRange }
                };
                this.cache.set(ragCacheKey, payload, 300);
                return payload;
            }

            const emptyPayload = {
                found: false,
                count: 0,
                tutors: [],
                filters: { subject, level, location, priceRange }
            };
            this.cache.set(ragCacheKey, emptyPayload, 120);
            return emptyPayload;

        } catch (error) {
            console.error('❌ Erreur RAG search:', error.message);
            return {
                found: false,
                count: 0,
                tutors: [],
                filters: {},
                error: error.message
            };
        }
    }

    extractSearchParams(message) {
        const subjects = [
            'mathématiques', 'maths', 'français', 'anglais', 'english',
            'chimie', 'physique', 'histoire', 'géographie', 'biologie',
            'informatique', 'python', 'javascript', 'allemand', 'espagnol', 'java',
            'programmation', 'science', 'philosophie', 'économie', 'droit', 'médecine'
        ];
        
        const levels = ['primaire', 'collège', 'lycée', 'bac', 'licence', 'master', 'seconde', 'première', 'terminale'];
        
        const params = {
            subject: null,
            level: null,
            priceRange: null,
            location: null
        };
        
        const lowerMsg = message.toLowerCase();
        
        for (const subject of subjects) {
            if (lowerMsg.includes(subject)) {
                params.subject = subject;
                break;
            }
        }
        
        for (const level of levels) {
            if (lowerMsg.includes(level)) {
                params.level = level;
                break;
            }
        }
        
        const priceMatch = message.match(/(\d+)\s*€|euros|educoins?/i);
        if (priceMatch) {
            params.priceRange = { max: parseInt(priceMatch[1]) };
        }
        
        const cities = ['paris', 'lyon', 'marseille', 'toulouse', 'bordeaux', 'lille', 'nice', 'nantes', 'strasbourg', 'montpellier'];
        for (const city of cities) {
            if (lowerMsg.includes(city)) {
                params.location = city;
                break;
            }
        }
        
        return params;
    }

    extractSkillsFromText(text) {
        const commonSkills = [
            'Java', 'Python', 'JavaScript', 'React', 'Node.js', 'Spring Boot', 'REST API',
            'Algorithmes', 'Base de données', 'SQL', 'HTML/CSS', 'TypeScript', 'Angular',
            'Vue.js', 'Docker', 'Git', 'Microservices', 'AWS', 'Machine Learning',
            'Data Science', 'Analyse de données', 'DevOps', 'Cybersécurité'
        ];
        
        const foundSkills = [];
        const lowerText = text.toLowerCase();
        
        commonSkills.forEach(skill => {
            if (lowerText.includes(skill.toLowerCase())) {
                foundSkills.push(skill);
            }
        });
        
        return foundSkills.length > 0 ? foundSkills : ['Cours personnalisé', 'Pédagogie adaptée'];
    }

    formatSubject(subjects) {
        if (Array.isArray(subjects)) {
            return subjects.length > 0 ? subjects[0] : 'Cours divers';
        }
        return subjects || 'Cours divers';
    }

    formatLocation(location) {
        if (!location) return 'En ligne';
        if (typeof location === 'object') {
            return location.city || location.address || 'Lieu à définir';
        }
        return location;
    }

    formatTeachingMode(mode) {
        const modes = {
            'online': 'En ligne',
            'in_person': 'En présentiel',
            'both': 'En ligne & présentiel',
            'hybrid': 'Hybride'
        };
        return modes[mode] || mode || 'À définir';
    }

    buildSystemPrompt(context, ragResults, intent) {
        let systemPrompt = `# CONTEXTE
    Tu es l'assistant IA d'EduMate, une plateforme de mise en relation élèves/tuteurs.

    ${context}

    # RÈGLES DE RÉPONSE STRICTES
    1. Pour le formatage:
    - JAMAIS d'astérisques * ou **
    - Utilise UNIQUEMENT __texte__ pour le gras
    - Pas d'italique du tout
    - Les listes utilisent des tirets -

    2. Pour les questions générales sur EduMate :
    - Réponse naturelle et utile
    - Propose l'étape suivante
    - Utilise des listes à puces si plusieurs points

    3. IMPORTANT - Exemples :
    - INCORRECT: *texte en italique* ou **texte gras**
    - CORRECT: __texte en gras__
    - INCORRECT: 🔹 *Créer des algorithmes*
    - CORRECT: - __Créer des algorithmes__

    4. Structure pour le gras:
    - Utilise __ avant et après le texte à mettre en gras
    - Exemple: __Cette partie est en gras__
    - Ne JAMAIS utiliser * ou **`;

        return systemPrompt;
    }

    async callOpenRouter(message, history, systemPrompt) {
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-2).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: message }
        ];
        
        try {
            console.log(`📡 Appel OpenRouter (${this.model})`);
            const startTime = Date.now();
            
            const cacheKey = `openrouter:${message.substring(0, 50)}`;
            const cached = this.cache.get(cacheKey);
            if (cached) {
                console.log(`⚡ Réponse depuis le cache (${Date.now() - startTime}ms)`);
                return cached;
            }
            
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: this.model,
                    messages,
                    max_tokens: 400,
                    temperature: 0.5,
                    top_p: 0.9,
                    top_k: 40,
                    frequency_penalty: 0.1,
                    presence_penalty: 0.1,
                    stop: ["\n\n", "User:", "Human:", "Assistant:"]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'HTTP-Referer': 'http://localhost:5173',
                        'X-Title': 'EduMate Chatbot',
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            
            let reply = response.data.choices[0].message.content;
            const duration = Date.now() - startTime;
            
            // Remplacer les astérisques d'italique par du gras avec __
            // *texte* → __texte__
            reply = reply.replace(/\*([^*]+?)\*/g, '__$1__');
            
            // Supprimer les ** (gras markdown)
            // **texte** → __texte__
            reply = reply.replace(/\*\*([^*]+?)\*\*/g, '__$1__');
            
            // Cache les réponses
            if (message.length < 100) {
                this.cache.set(cacheKey, reply, 1800);
            }
            
            console.log(`✅ Réponse reçue en ${duration}ms`);
            return reply;
            
        } catch (error) {
            console.error('❌ OpenRouter Error:', error.response?.data || error.message);
            
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                return "EduMate vous aide à trouver le tuteur idéal. Pour plus de détails, veuillez réessayer.";
            }
            
            throw new Error('Erreur OpenRouter: ' + (error.response?.data?.error?.message || error.message));
        }
    }
    
    async generateEmbedding(text) {
        try {
            const response = await axios.post(
                `${this.ollamaUrl}/api/embeddings`,
                {
                    model: this.embedModel,
                    prompt: text
                },
                { timeout: 10000 }
            );
            
            return response.data.embedding;
        } catch (error) {
            console.error('❌ Embedding Error:', error.message);
            return null;
        }
    }
}

module.exports = new ChatbotService();