import api from './api';

const AI_SUMMARY_API_URL = 'http://localhost:3004/api/ai/generate-tutor-summary';

export async function fetchTutorAISummary(query, tutors) {
  try {
    const response = await api.post(AI_SUMMARY_API_URL, {
      query,
      tutors
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la génération du résumé IA:', error);
    return null;
  }
}
