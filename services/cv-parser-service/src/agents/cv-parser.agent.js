const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const OpenAI = require('openai');

class CVParserAgent {
  constructor() {
    console.log('✅ CVParserAgent initialisé - VERSION RÉELLE');
    
    // VÉRIFIER LA CLÉ OPENAI
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-xxx') {
      console.log('🔑 Clé OpenAI détectée:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      console.error('❌ ERREUR CRITIQUE: OPENAI_API_KEY non configurée!');
      console.error('Veuillez ajouter votre clé OpenAI dans le fichier .env');
      console.error('Format: OPENAI_API_KEY=sk-votre-clé-réelle-ici');
      this.openai = null;
    }
  }

  /**
   * Analyser un CV de manière INTELLIGENTE (pas de mock!)
   */
  async parseCV(fileBuffer, filename, contentType) {
    try {
      console.log(`\n🔍 DÉBUT ANALYSE RÉELLE DU CV: ${filename}`);
      console.log(`📏 Taille: ${fileBuffer.length} bytes`);
      console.log(`📄 Type: ${contentType}`);
      
      // 1. EXTRAIRE LE TEXTE DU FICHIER
      console.log('📝 Extraction du texte depuis le fichier...');
      const rawText = await this.extractTextFromFile(fileBuffer, contentType);
      
      if (!rawText || rawText.trim().length < 50) {
        throw new Error('Texte insuffisant dans le CV');
      }
      
      // 2. NETTOYER LE TEXTE
      const cleanedText = this.cleanText(rawText);
      
      console.log(`✅ Texte extrait: ${cleanedText.length} caractères`);
      console.log('📄 Extrait du CV (premiers 1000 caractères):');
      console.log('--- DÉBUT CV ---');
      console.log(cleanedText.substring(0, 1000));
      console.log('--- FIN CV ---');
      
      // 3. ANALYSE INTELLIGENTE AVEC OPENAI
      console.log('🧠 Analyse intelligente avec OpenAI...');
      const extractedData = await this.analyzeWithOpenAI(cleanedText);
      
      // 4. VALIDATION
      console.log('✅ Analyse terminée avec succès!');
      console.log('📊 Résultats:');
      console.log('- Prénom:', extractedData.personal?.firstName || 'Non trouvé');
      console.log('- Nom:', extractedData.personal?.lastName || 'Non trouvé');
      console.log('- Email:', extractedData.personal?.email?.join(', ') || 'Non trouvé');
      console.log('- Téléphone:', extractedData.personal?.phone?.join(', ') || 'Non trouvé');
      console.log('- Compétences:', extractedData.skills?.technical?.length || 0, 'compétences');
      console.log('- Formations:', extractedData.education?.length || 0, 'formations');
      console.log('- Expériences:', extractedData.experience?.length || 0, 'expériences');
      
      return {
        success: true,
        data: extractedData,
        metadata: {
          filename,
          contentType,
          textLength: cleanedText.length,
          extractionDate: new Date().toISOString(),
          hasOpenAI: true
        }
      };
      
    } catch (error) {
      console.error('❌ ERREUR lors de l\'analyse du CV:', error.message);
      console.error('Stack:', error.stack);
      
      // Si OpenAI échoue, essayer l'extraction heuristique
      console.log('🔄 Tentative d\'extraction heuristique...');
      try {
        const rawText = await this.extractTextFromFile(fileBuffer, contentType);
        const cleanedText = this.cleanText(rawText);
        const heuristicData = this.extractWithHeuristics(cleanedText);
        
        return {
          success: true,
          data: heuristicData,
          metadata: {
            filename,
            contentType,
            textLength: cleanedText.length,
            extractionDate: new Date().toISOString(),
            hasOpenAI: false,
            error: error.message
          }
        };
      } catch (fallbackError) {
        throw new Error(`Échec complet: ${error.message} | ${fallbackError.message}`);
      }
    }
  }

  /**
   * Extraire le texte selon le type de fichier
   */
  async extractTextFromFile(fileBuffer, contentType) {
    try {
      console.log('📄 Extraction texte selon type:', contentType);
      
      if (contentType === 'application/pdf') {
        console.log('📊 Analyse PDF...');
        const pdfData = await pdf(fileBuffer);
        return pdfData.text;
      } else if (contentType.includes('msword') || contentType.includes('document')) {
        console.log('📝 Analyse Word...');
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        return result.value;
      } else if (contentType === 'text/plain') {
        console.log('📃 Analyse texte...');
        return fileBuffer.toString('utf-8');
      } else {
        throw new Error(`Format non supporté: ${contentType}`);
      }
    } catch (error) {
      console.error('❌ Erreur extraction texte:', error);
      throw error;
    }
  }

  /**
   * Nettoyer le texte
   */
  cleanText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[•▪▫○◉◈]/g, '•')
      .trim();
  }

  /**
   * Analyse INTELLIGENTE avec OpenAI
   */
  async analyzeWithOpenAI(text) {
    if (!this.openai) {
      throw new Error('OpenAI non configuré');
    }
    
    console.log('🧠 Envoi à OpenAI GPT-4...');
    
    const prompt = `TU ES UN EXPERT EN ANALYSE DE CV. ANALYSE CE CV ET EXTRAIS TOUTES LES INFORMATIONS.

CV À ANALYSER:
"""
${text.substring(0, 15000)}
"""

INSTRUCTIONS CRITIQUES:
1. NE JAMAIS INVENTER DES DONNÉES
2. EXTRAIRE UNIQUEMENT CE QUI EST DANS LE CV
3. SI UNE INFORMATION N'EST PAS DANS LE CV, LAISSER VIDE
4. ÊTRE PRÉCIS ET EXHAUSTIF

FORMAT DE RÉPONSE EXIGÉ (JSON UNIQUEMENT):
{
  "personal": {
    "firstName": "string (prénom exact trouvé dans le CV, laisser vide si absent)",
    "lastName": "string (nom exact trouvé dans le CV, laisser vide si absent)",
    "email": ["string[] (emails trouvés dans le CV)"],
    "phone": ["string[] (numéros de téléphone trouvés dans le CV)"],
    "address": "string (adresse trouvée dans le CV)",
    "birthDate": "string (date de naissance au format YYYY-MM-DD si trouvée)",
    "gender": "string (Homme/Femme/Autre si clairement identifiable)"
  },
  "education": [
    {
      "educationLevel": "string (Bac, Licence, Master, Doctorat, etc.)",
      "field": "string (domaine d'étude)",
      "school": "string (nom de l'établissement)",
      "country": "string (pays)",
      "startYear": "number",
      "endYear": "number",
      "isCurrent": "boolean",
      "diplomaName": "string (nom du diplôme)"
    }
  ],
  "experience": [
    {
      "jobTitle": "string (intitulé du poste)",
      "employmentType": "string (CDI, CDD, Stage, etc.)",
      "company": "string (nom de l'entreprise)",
      "location": "string (lieu)",
      "startMonth": "string (mois)",
      "startYear": "number",
      "endMonth": "string (mois)",
      "endYear": "number",
      "isCurrent": "boolean",
      "description": "string (description)",
      "achievements": ["string[] (réalisations)"]
    }
  ],
  "skills": {
    "technical": ["string[] (TOUTES les compétences techniques mentionnées dans le CV)"],
    "languages": ["string[] (langues parlées)"],
    "soft": ["string[] (compétences douces)"]
  },
  "summary": "string (résumé professionnel extrait du CV)",
  "validation": {
    "quality": "string (BASIC/GOOD/EXCELLENT basé sur la complétude)",
    "issues": ["string[] (problèmes détectés)"],
    "suggestions": ["string[] (suggestions d'amélioration)"]
  }
}

IMPORTANT: RÉPONDRE UNIQUEMENT EN JSON VALIDE.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "Tu es un assistant expert en analyse de CV. Tu dois extraire les informations de manière précise et structurée. Ne jamais inventer de données."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      console.log('✅ Réponse OpenAI reçue');
      const extracted = JSON.parse(response.choices[0].message.content);
      
      // Post-traitement
      return this.validateExtractedData(extracted);
      
    } catch (error) {
      console.error('❌ Erreur OpenAI:', error.message);
      throw error;
    }
  }

  /**
   * Valider les données extraites
   */
  validateExtractedData(data) {
    // S'assurer que tous les champs existent
    const validated = {
      personal: data.personal || {},
      education: data.education || [],
      experience: data.experience || [],
      skills: data.skills || { technical: [], languages: [], soft: [] },
      summary: data.summary || '',
      validation: data.validation || { quality: 'BASIC', issues: [], suggestions: [] }
    };

    // Nettoyer les emails
    if (validated.personal.email) {
      validated.personal.email = validated.personal.email
        .filter(email => typeof email === 'string')
        .map(email => email.toLowerCase().trim())
        .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        .filter((email, index, array) => array.indexOf(email) === index);
    }

    // Nettoyer les téléphones
    if (validated.personal.phone) {
      validated.personal.phone = validated.personal.phone
        .filter(phone => typeof phone === 'string')
        .map(phone => phone.trim())
        .filter((phone, index, array) => array.indexOf(phone) === index);
    }

    // Évaluer la qualité
    validated.validation.quality = this.evaluateDataQuality(validated);
    
    return validated;
  }

  /**
   * Évaluer la qualité des données
   */
  evaluateDataQuality(data) {
    let score = 0;
    
    if (data.personal.firstName && data.personal.lastName) score += 30;
    if (data.personal.email?.length > 0) score += 20;
    if (data.personal.phone?.length > 0) score += 10;
    if (data.skills.technical?.length > 5) score += 20;
    if (data.education?.length > 0) score += 10;
    if (data.experience?.length > 0) score += 10;

    if (score >= 80) return 'EXCELLENT';
    if (score >= 60) return 'GOOD';
    return 'BASIC';
  }

  /**
   * Extraction heuristique (fallback sans OpenAI)
   */
  extractWithHeuristics(text) {
    console.log('🔍 Extraction heuristique sans OpenAI...');
    
    const extracted = {
      personal: {},
      education: [],
      experience: [],
      skills: { technical: [], languages: [], soft: [] },
      summary: '',
      validation: {
        quality: 'BASIC',
        issues: ['Extraction sans IA - données limitées'],
        suggestions: ['Pour une meilleure extraction, configurez OpenAI API']
      }
    };

    // Extraire emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    if (emails.length > 0) {
      extracted.personal.email = [...new Set(emails.map(e => e.toLowerCase()))];
    }

    // Extraire téléphones (patterns français)
    const phonePatterns = [
      /(\+33|0)[1-9](\d{2}){4}/g,
      /(\d{2}\s?){5}/g,
      /T[ée]l[ée]phone[\s:]*([+\d\s().-]{10,})/gi
    ];

    const phones = [];
    phonePatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        const cleanPhone = match.replace(/[^\d+]/g, '');
        if (cleanPhone.length >= 10) {
          phones.push(cleanPhone);
        }
      });
    });
    
    if (phones.length > 0) {
      extracted.personal.phone = [...new Set(phones)];
    }

    // Extraire compétences (liste étendue)
    const allTechnicalSkills = [
      // Frontend
      'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'Svelte',
      'Next.js', 'Nuxt.js', 'Webpack', 'Babel', 'Sass', 'Less', 'Tailwind CSS',
      // Backend
      'Node.js', 'Express', 'Python', 'Django', 'Flask', 'Java', 'Spring', 'PHP',
      'Laravel', 'Symfony', 'Ruby', 'Ruby on Rails', 'Go', 'C#', '.NET', 'ASP.NET',
      // Base de données
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'SQL Server',
      'Firebase', 'Supabase', 'GraphQL', 'REST API', 'SOAP',
      // DevOps & Cloud
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Git', 'GitHub',
      'GitLab', 'CI/CD', 'Jenkins', 'Travis CI', 'GitHub Actions',
      // Mobile
      'React Native', 'Flutter', 'Swift', 'Kotlin', 'Android', 'iOS',
      // Autres
      'Linux', 'Windows Server', 'Agile', 'Scrum', 'Jira', 'Confluence'
    ];

    allTechnicalSkills.forEach(skill => {
      const regex = new RegExp(`\\b${skill}\\b`, 'i');
      if (regex.test(text)) {
        extracted.skills.technical.push(skill);
      }
    });

    // Trier et dédupliquer
    extracted.skills.technical = [...new Set(extracted.skills.technical)].sort();

    return extracted;
  }
}

module.exports = new CVParserAgent();