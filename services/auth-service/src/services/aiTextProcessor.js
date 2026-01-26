const axios = require('axios');
require('dotenv').config();

class AITextProcessor {
  constructor() {
    this.apiKey = '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';
  }

  // MÉTHODE EXISTANTE : Générer une offre COMPLÈTE
  async generateOfferFromSkills(skills, rawText = '') {    
    try {
      const skillsList = Array.isArray(skills) ? skills : [skills];
      
      console.log('🚀 Appel IA pour générer offre avec skills:', skillsList);
      
      const prompt = `Tu es un expert en rédaction d'annonces de cours. 

COMPÉTENCES À ENSEIGNER : ${skillsList.join(', ')}

INSTRUCTIONS TRÈS IMPORTANTES :

1. **TITRE** (max 60 caractères) :
   - Professionnel et accrocheur
   - Commencer par "Cours de...", "Formation en...", "Atelier de..."
   - JAMAIS utiliser "Professeur de...", "Enseignant de...", "Tuteur de..."
   - Exemple : "Atelier complet de cuisine"

2. **DESCRIPTION DÉTAILLÉE** (OBLIGATOIRE - 6-8 phrases minimum) :
   - DÉBUT par expliquer CE QUE l'étudiant apprendra
   - DÉTAILLE chaque compétence mentionnée
   - DÉCRIS la méthode d'enseignement (pratique, projets, exercices)
   - MENTIONNE les bénéfices concrets
   - SOIS SPÉCIFIQUE - pas de phrases vagues
   - FINIS par les avantages pour l'étudiant

${rawText ? `CONTEXTE SUPPLÉMENTAIRE (à intégrer si pertinent) : "${rawText}"` : ''}

RÉPONSE EN JSON :
{
  "title": "Le titre ici (DOIT commencer par Cours/Formation/Atelier)",
  "description": "La description détaillée ici (minimum 6 phrases)"
}`;

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'liquid/lfm-2.5-1.2b-instruct:free',
          messages: [
            {
              role: 'system',
              content: 'TU DOIS TOUJOURS FOURNIR UNE DESCRIPTION DÉTAILLÉE DE 6-8 PHRASES. IMPORTANT : Titre = "Cours de...", JAMAIS "Professeur de...".'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
          max_tokens: 800
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('✅ Réponse IA reçue');
      
      const aiText = response.data.choices[0].message.content;
      
      if (!this.isCompleteJSON(aiText)) {
        console.log('⚠️ JSON incomplet, réparation...');
        const fixedJson = this.fixIncompleteJSON(aiText);
        return this.parseOfferResponse(fixedJson, skillsList);
      }
      
      const result = this.parseOfferResponse(aiText, skillsList);
      
      // Vérification que la description est assez longue
      if (!result.description || result.description.length < 150) {
        console.warn('⚠️ Description trop courte, nouvel appel IA...');
        return await this.regenerateDescription(skillsList, result.title);
      }
      
      return result;

    } catch (error) {
      console.error('❌ Erreur API:', error.message);
      throw new Error(`Échec génération IA: ${error.message}`);
    }
  }

  async analyzeTextWithAI(text) {
    try {      
      // Échapper les guillemets dans le texte
      const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      
      const prompt = `Analyse ce texte et extrais les compétences mentionnées :

TEXTE : "${escapedText}"

Tu dois :
1. Identifier les compétences/cours/programmes mentionnés, souvent les mots-clés
2. Générer un titre professionnel pour une annonce de cours
3. Créer une description détaillée de l'offre
4. RETOURNER UNIQUEMENT UN OBJET JSON VALIDE SANS TEXTE SUPPLÉMENTAIRE

IMPORTANT POUR LE TITRE :
- DOIT commencer par "Cours de...", "Formation en...", "Atelier de..."
- JAMAIS utiliser "Professeur de...", "Enseignant de..."

EXEMPLES :
- "Enseignant en Deep Learning" → "Cours de Deep Learning et Intelligence Artificielle"
- "Professeur de Python" → "Formation Python avancée"
- "Tuteur en cuisine" → "Atelier de cuisine pratique"

FORMAT DE RÉPONSE OBLIGATOIRE :
{
  "title": "Titre de cours professionnel basé sur les compétences",
  "description": "Description détaillée de l'offre",
  "skills": ["compétence1", "compétence2", "etc"]
}`;

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'liquid/lfm-2.5-1.2b-instruct:free',
          messages: [
            {
              role: 'system',
              content: `Tu es un expert en analyse de textes. Tu DOIS retourner un JSON VALIDE avec :
1. Un "title" : titre professionnel pour une annonce de cours
2. Une "description" : description détaillée (4-6 phrases)
3. Un tableau "skills" : liste des compétences identifiées, les compétences doivent être des mots-clés précis
TRÈS IMPORTANT : Le titre DOIT commencer par "Cours de...", "Formation en...". JAMAIS "Professeur de...".`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
          max_tokens: 800
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );

      const aiText = response.data.choices[0].message.content.trim();
      
      // Nettoyer la réponse avant parsing
      const cleanedText = this.cleanJSONResponse(aiText);
      
      try {
        const result = JSON.parse(cleanedText);
        
        // Valider le format
        if (!result.title || !result.description || !Array.isArray(result.skills)) {
          throw new Error('Format JSON invalide - champs manquants');
        }
        
        return result;
        
      } catch (parseError) {
        console.error('Erreur parsing JSON:', parseError.message);
        console.error('Texte problématique (premiers 300 caractères):', cleanedText.substring(0, 300));
        
        // Essayer de réparer le JSON
        const repairedJSON = this.repairJSON(cleanedText);
        const finalResult = JSON.parse(repairedJSON);
        
        // S'assurer que les champs requis existent
        if (!finalResult.title) finalResult.title = "Cours personnalisé";
        if (!finalResult.description) finalResult.description = "Cours adapté à vos besoins spécifiques.";
        if (!Array.isArray(finalResult.skills)) finalResult.skills = [];
        
        return finalResult;
      }
      
    } catch (error) {
      console.error('❌ Erreur analyse IA:', error.message);
      if (error.response) {
        console.error('Réponse API:', error.response.data);
      }
      throw new Error(`Échec analyse IA: ${error.message}`);
    }
  }

  // MÉTHODE : Générer uniquement un titre
  async generateTitleOnly(skills) {
    try {
      const skillsList = Array.isArray(skills) ? skills : [skills];
      
      const prompt = `Crée un titre professionnel pour un cours enseignant ces compétences : ${skillsList.join(', ')}

Le titre doit être :
- Accrocheur (max 60 caractères)
- Professionnel
- Intégrer les compétences principales
- DOIT commencer par "Cours de...", "Formation en...", "Atelier de..."
- JAMAIS utiliser "Professeur de...", "Enseignant de..."

Exemples :
- ["Python", "Data"] → "Formation Python pour l'analyse de données"

Réponds uniquement avec le titre.`;

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'liquid/lfm-2.5-1.2b-instruct:free',
          messages: [
            {
              role: 'system',
              content: 'Tu crées des titres professionnels pour des cours. Règles : "Cours de...", "Formation...", JAMAIS "Professeur...".'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 100
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const title = response.data.choices[0].message.content.trim();
      
      return {
        title: title || `Cours de ${skillsList[0]}`,
        description: '',
        skills: skillsList
      };

    } catch (error) {
      console.error('❌ Erreur génération titre:', error.message);
      throw error;
    }
  }

  // MÉTHODE : generateTitleFromSkills (pour compatibilité)
  async generateTitleFromSkills(skills) {
    // Appelle simplement generateTitleOnly mais retourne le même format attendu
    const result = await this.generateTitleOnly(skills);
    return result;
  }

  // Méthode de secours si la description est trop courte
  async regenerateDescription(skills, title) {
    try {
      const prompt = `Génère une description DÉTAILLÉE pour ce cours :

Titre : "${title}"
Compétences : ${Array.isArray(skills) ? skills.join(', ') : skills}

Crée une description de 6-8 phrases qui :
1. Explique ce que l'étudiant apprendra
2. Détaille les compétences enseignées
3. Décrit la méthode pédagogique
4. Mentionne les bénéfices
5. Sois concret et spécifique

Réponds uniquement avec la description, sans titre ni JSON.`;

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'liquid/lfm-2.5-1.2b-instruct:free',
          messages: [
            {
              role: 'system',
              content: 'Tu génères DES DESCRIPTIONS DÉTAILLÉES pour des cours. Minimum 6 phrases.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const description = response.data.choices[0].message.content.trim();
      
      return {
        title: title,
        description: description,
        skills: Array.isArray(skills) ? skills : [skills]
      };
      
    } catch (error) {
      console.error('❌ Erreur régénération description:', error.message);
      throw error;
    }
  }

  // NOUVELLE MÉTHODE : Nettoyer la réponse JSON
  cleanJSONResponse(text) {
    let cleaned = text.trim();
    
    // 1. Trouver le début et la fin du JSON
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    } else {
      // Si pas de JSON trouvé, créer un JSON par défaut
      return '{"title": "Cours personnalisé", "description": "Cours adapté à vos besoins.", "skills": []}';
    }
    
    // 2. Échapper les guillemets non échappés dans les chaînes
    // Chercher les chaînes entre guillemets
    const stringRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    let match;
    const strings = [];
    
    while ((match = stringRegex.exec(cleaned)) !== null) {
      strings.push(match[1]);
    }
    
    // Échapper chaque chaîne
    strings.forEach(str => {
      const escapedStr = str
        .replace(/"/g, '\\"')  // Échapper les guillemets
        .replace(/\n/g, '\\n') // Échapper les nouvelles lignes
        .replace(/\r/g, '\\r') // Échapper les retours chariot
        .replace(/\t/g, '\\t'); // Échapper les tabulations
      
      cleaned = cleaned.replace(`"${str}"`, `"${escapedStr}"`);
    });
    
    // 3. Remplacer les guillemets simples par des guillemets doubles pour les clés (si nécessaire)
    cleaned = cleaned.replace(/'([^']+)':/g, '"$1":');
    
    // 4. Supprimer les trailing commas
    cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
    
    // 5. Échapper les backslashes non échappés
    cleaned = cleaned.replace(/(?<!\\)\\(?!["\\/bfnrt])/g, '\\\\');
    
    return cleaned;
  }

  // NOUVELLE MÉTHODE : Réparer les JSON cassés
  repairJSON(brokenJSON) {
    try {
      // Essayer de parser d'abord
      return JSON.parse(brokenJSON);
    } catch (e) {
      console.log('🛠️ Tentative de réparation JSON...');
      
      let repaired = brokenJSON;
      
      // 1. Compter les guillemets
      const quoteCount = (repaired.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        // Ajouter un guillemet à la fin si impair
        repaired += '"';
      }
      
      // 2. Fermer les objets et tableaux
      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      for (let i = 0; i < openBraces - closeBraces; i++) {
        repaired += '}';
      }
      
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/\]/g) || []).length;
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        repaired += ']';
      }
      
      // 3. Remplacer les virgules orphelines
      repaired = repaired.replace(/,\s*,/g, ',');
      repaired = repaired.replace(/,\s*$/g, '');
      
      // 4. Ajouter des valeurs manquantes pour les clés sans valeur
      repaired = repaired.replace(/:\s*,/g, ': "",');
      repaired = repaired.replace(/:\s*$/g, ': ""');
      
      // 5. S'assurer que c'est un objet JSON valide
      if (!repaired.startsWith('{')) {
        repaired = '{' + repaired;
      }
      if (!repaired.endsWith('}')) {
        repaired = repaired + '}';
      }
      
      console.log('🛠️ JSON réparé (premiers 300 caractères):', repaired.substring(0, 300));
      
      try {
        return JSON.parse(repaired);
      } catch (finalError) {
        console.error('❌ Réparation JSON échouée:', finalError.message);
        // Retourner un JSON minimal valide
        return {
          title: "Cours personnalisé",
          description: "Cours adapté à vos besoins spécifiques.",
          skills: []
        };
      }
    }
  }

  // Parser simple pour la réponse
  parseOfferResponse(aiText, skills) {
    try {
      const parsed = JSON.parse(aiText);
      
      return {
        title: parsed.title || `Cours de ${skills[0]}`,
        description: parsed.description || '',
        skills: skills
      };
    } catch (error) {
      console.error('❌ Parse JSON échoué:', error.message);
      throw new Error('Format de réponse IA invalide');
    }
  }

  // Méthodes utilitaires
  isCompleteJSON(text) {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  fixIncompleteJSON(incompleteJson) {
    let fixed = incompleteJson.trim();
    
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixed += '}';
    }
    
    return fixed;
  }
  
}

module.exports = new AITextProcessor();