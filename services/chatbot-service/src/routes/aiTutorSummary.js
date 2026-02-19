const express = require('express');
const router = express.Router();
const axios = require('axios');

// Endpoint IA pour résumé tuteurs (intro/conclusion)
router.post('/generate-tutor-summary', async (req, res) => {
  try {
    const { query, tutors } = req.body;
    if (!query || !Array.isArray(tutors) || tutors.length === 0) {
      return res.status(400).json({ success: false, message: 'Requête ou tuteurs manquants' });
    }

    // Construire le prompt comme dans le chatbot
    const tutorsSummary = tutors.map((tutor, idx) => {
      return `Tuteur ${idx+1} :\nNom : ${tutor.name}\nMatière : ${tutor.subject}\nCompétences : ${(tutor.skills||[]).join(', ')}\nNiveau : ${tutor.level}\nTarif : ${tutor.price}\nLieu : ${tutor.location}\nMode : ${tutor.teachingMode}`;
    }).join("\n---\n");

    const systemPrompt = [
      "Tu es l'assistant IA d'EduMate, une plateforme de mise en relation élèves/tuteurs.",
      `Voici un résumé des profils trouvés :`,
      tutorsSummary,
      "Génère uniquement :\n- Une phrase d'introduction personnalisée pour l'utilisateur (1-2 phrases max)\n- Une phrase de conclusion ou de conseil (1-2 phrases max)\nN'inclus pas de listing, pas de détails, pas de répétition des profils. Le listing sera ajouté par le système."
    ].join("\n\n");

    // Appel OpenRouter (remplace par ta logique d'appel IA)
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'qwen/qwen1.5-110b-chat';
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      max_tokens: 200,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.choices[0].message.content;
    // Découper intro/conclusion (simple split)
    const [intro, conclusion] = content.split(/\n\s*\n/);
    res.json({ success: true, intro: intro?.trim() || '', conclusion: conclusion?.trim() || '' });
  } catch (error) {
    console.error('Erreur IA tutor summary:', error?.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Erreur IA', error: error.message });
  }
});

module.exports = router;
