const { OpenAI } = require('openai');

class DataEnhancerAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Fusion intelligente des données CV et LinkedIn
   */
  async mergeProfiles(cvData, linkedinData, existingProfile = null) {
    try {
      // 1. Préparation des données
      const datasets = this.prepareDatasets(cvData, linkedinData, existingProfile);

      // 2. Fusion avec IA
      const merged = await this.mergeWithAI(datasets);

      // 3. Validation et nettoyage
      const validated = this.validateMerge(merged);

      // 4. Génération de suggestions d'amélioration
      const suggestions = await this.generateSuggestions(validated);

      return {
        success: true,
        data: validated,
        metadata: {
          sources: Object.keys(datasets).filter(k => datasets[k]),
          mergeDate: new Date().toISOString(),
          confidence: this.calculateConfidence(validated)
        },
        suggestions,
        conflicts: this.detectConflicts(datasets)
      };
    } catch (error) {
      console.error('Data merge error:', error);
      throw new Error(`Erreur lors de la fusion des données: ${error.message}`);
    }
  }

  /**
   * Préparer les datasets pour la fusion
   */
  prepareDatasets(cvData, linkedinData, existingProfile) {
    return {
      cv: cvData ? this.normalizeDataset(cvData, 'cv') : null,
      linkedin: linkedinData ? this.normalizeDataset(linkedinData, 'linkedin') : null,
      existing: existingProfile ? this.normalizeDataset(existingProfile, 'existing') : null
    };
  }

  /**
   * Normaliser un dataset
   */
  normalizeDataset(data, source) {
    // Normaliser selon la source
    const normalizers = {
      cv: this.normalizeCVData.bind(this),
      linkedin: this.normalizeLinkedInData.bind(this),
      existing: this.normalizeExistingData.bind(this)
    };

    return normalizers[source](data);
  }

  normalizeCVData(data) {
    return {
      personal: {
        firstName: data.personal?.firstName || '',
        lastName: data.personal?.lastName || '',
        email: data.personal?.email || [],
        phone: data.personal?.phone || [],
        address: data.personal?.address || '',
        birthDate: data.personal?.birthDate || ''
      },
      education: data.education || [],
      experience: data.experience || [],
      skills: data.skills || { technical: [], languages: [], soft: [] },
      summary: data.summary || ''
    };
  }

  normalizeLinkedInData(data) {
    return {
      personal: {
        firstName: data.personal?.firstName || '',
        lastName: data.personal?.lastName || '',
        email: data.personal?.email ? [data.personal.email] : [],
        phone: data.personal?.phone ? [data.personal.phone] : [],
        address: data.personal?.location || '',
        profileImage: data.personal?.profileImage
      },
      education: data.education || [],
      experience: data.experience || [],
      skills: {
        technical: data.skills?.technical || [],
        languages: [],
        soft: []
      },
      summary: data.summary || ''
    };
  }

  normalizeExistingData(data) {
    return {
      personal: {
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email ? [data.email] : [],
        phone: data.phone ? [data.phone] : [],
        address: data.address || '',
        birthDate: data.birthDate || ''
      },
      education: data.diplomas || [],
      experience: data.experiences || [],
      skills: {
        technical: data.skills || [],
        languages: [],
        soft: []
      },
      summary: data.bio || ''
    };
  }

  /**
   * Fusionner avec IA
   */
  async mergeWithAI(datasets) {
    const availableDatasets = Object.entries(datasets)
      .filter(([key, value]) => value !== null)
      .map(([key, value]) => `${key.toUpperCase()}:\n${JSON.stringify(value, null, 2)}`)
      .join('\n\n');

    const prompt = `Tu es un expert en fusion de données de profil. Fusionne ces données de manière intelligente:

    RÈGLES DE FUSION:
    1. PRIORITÉ: CV > LinkedIn > Existing (en cas de conflit)
    2. Compléter les champs manquants avec les autres sources
    3. Supprimer les doublons (mêmes données dans plusieurs sources)
    4. Garder les versions les plus récentes/détaillées
    5. Maintenir la cohérence sémantique

    DONNÉES À FUSIONNER:
    ${availableDatasets}

    Réponds UNIQUEMENT au format JSON structuré suivant:
    {
      "personal": {
        "firstName": "string (obligatoire)",
        "lastName": "string (obligatoire)",
        "email": "string[] (valides, triés)",
        "phone": "string[] (formattés +33)",
        "address": "string",
        "birthDate": "string (YYYY-MM-DD)",
        "gender": "string",
        "profilePicture": "string (URL)"
      },
      "education": [
        {
          "educationLevel": "string",
          "field": "string",
          "school": "string",
          "country": "string",
          "startYear": "number",
          "endYear": "number",
          "isCurrent": "boolean",
          "diplomaName": "string"
        }
      ],
      "experience": [
        {
          "jobTitle": "string",
          "employmentType": "string",
          "company": "string",
          "location": "string",
          "startMonth": "string",
          "startYear": "number",
          "endMonth": "string",
          "endYear": "number",
          "isCurrent": "boolean",
          "description": "string",
          "achievements": "string[]"
        }
      ],
      "skills": {
        "technical": "string[] (triés, sans doublons)",
        "languages": "string[]",
        "soft": "string[]"
      },
      "summary": "string (500-1000 caractères, professionnel)"
    }`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en fusion de données de profil professionnel."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      });

      const merged = JSON.parse(response.choices[0].message.content);
      
      // Post-traitement
      return this.postProcessMerge(merged);
    } catch (error) {
      console.error('AI merge error:', error);
      // Fallback: fusion manuelle
      return this.manualMerge(datasets);
    }
  }

  /**
   * Fusion manuelle (fallback)
   */
  manualMerge(datasets) {
    const merged = {
      personal: {},
      education: [],
      experience: [],
      skills: { technical: [], languages: [], soft: [] },
      summary: ''
    };

    // Priorité: CV > LinkedIn > Existing
    const sources = ['cv', 'linkedin', 'existing'];
    
    sources.forEach(source => {
      const data = datasets[source];
      if (!data) return;

      // Fusionner personal
      if (data.personal) {
        Object.keys(data.personal).forEach(key => {
          if (!merged.personal[key] || 
              (Array.isArray(merged.personal[key]) && merged.personal[key].length === 0) ||
              merged.personal[key] === '') {
            merged.personal[key] = data.personal[key];
          }
        });
      }

      // Fusionner education (éviter les doublons)
      if (data.education) {
        data.education.forEach(edu => {
          const exists = merged.education.some(existing => 
            existing.school === edu.school && 
            existing.educationLevel === edu.educationLevel &&
            existing.startYear === edu.startYear
          );
          if (!exists) {
            merged.education.push(edu);
          }
        });
      }

      // Fusionner experience
      if (data.experience) {
        data.experience.forEach(exp => {
          const exists = merged.experience.some(existing => 
            existing.company === exp.company && 
            existing.jobTitle === exp.jobTitle &&
            existing.startYear === exp.startYear
          );
          if (!exists) {
            merged.experience.push(exp);
          }
        });
      }

      // Fusionner skills
      if (data.skills) {
        if (data.skills.technical) {
          merged.skills.technical = [...new Set([...merged.skills.technical, ...data.skills.technical])];
        }
        if (data.skills.languages) {
          merged.skills.languages = [...new Set([...merged.skills.languages, ...data.skills.languages])];
        }
        if (data.skills.soft) {
          merged.skills.soft = [...new Set([...merged.skills.soft, ...data.skills.soft])];
        }
      }

      // Summary: garder le plus long
      if (data.summary && data.summary.length > merged.summary.length) {
        merged.summary = data.summary;
      }
    });

    return merged;
  }

  /**
   * Post-traitement après fusion
   */
  postProcessMerge(merged) {
    // Trier les expériences par date (plus récent d'abord)
    if (merged.experience) {
      merged.experience.sort((a, b) => {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        
        const aYear = a.startYear || 0;
        const bYear = b.startYear || 0;
        
        if (aYear !== bYear) return bYear - aYear;
        
        const months = {
          'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4,
          'mai': 5, 'juin': 6, 'juillet': 7, 'août': 8,
          'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
        };
        
        const aMonth = months[a.startMonth?.toLowerCase()] || 0;
        const bMonth = months[b.startMonth?.toLowerCase()] || 0;
        
        return bMonth - aMonth;
      });
    }

    // Trier les formations par date
    if (merged.education) {
      merged.education.sort((a, b) => {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return (b.endYear || b.startYear || 0) - (a.endYear || a.startYear || 0);
      });
    }

    // Trier et nettoyer les compétences
    if (merged.skills) {
      if (merged.skills.technical) {
        merged.skills.technical = [...new Set(merged.skills.technical)]
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .sort();
      }
      if (merged.skills.languages) {
        merged.skills.languages = [...new Set(merged.skills.languages)]
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .sort();
      }
      if (merged.skills.soft) {
        merged.skills.soft = [...new Set(merged.skills.soft)]
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .sort();
      }
    }

    // Normaliser les emails
    if (merged.personal?.email) {
      merged.personal.email = merged.personal.email
        .map(email => email.toLowerCase().trim())
        .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        .filter((email, index, array) => array.indexOf(email) === index); // Supprimer doublons
    }

    // Normaliser les téléphones
    if (merged.personal?.phone) {
      merged.personal.phone = merged.personal.phone
        .map(phone => {
          const digits = phone.replace(/\D/g, '');
          if (digits.length === 10 && digits.startsWith('0')) {
            return `+33${digits.substring(1)}`;
          } else if (digits.length === 9 && digits.startsWith('6') || digits.startsWith('7')) {
            return `+33${digits}`;
          }
          return phone;
        })
        .filter((phone, index, array) => array.indexOf(phone) === index);
    }

    return merged;
  }

  /**
   * Valider la fusion
   */
  validateMerge(merged) {
    const validation = {
      isValid: true,
      issues: [],
      missingFields: [],
      recommendations: []
    };

    // Champs obligatoires
    const requiredFields = [
      'personal.firstName',
      'personal.lastName',
      'personal.email'
    ];

    requiredFields.forEach(field => {
      const keys = field.split('.');
      let value = merged;
      keys.forEach(key => value = value?.[key]);
      
      if (!value || (Array.isArray(value) && value.length === 0)) {
        validation.isValid = false;
        validation.missingFields.push(field);
      }
    });

    // Vérifier la cohérence des dates
    if (merged.education) {
      merged.education.forEach((edu, index) => {
        if (edu.startYear && edu.endYear && edu.endYear < edu.startYear) {
          validation.issues.push(`Formation ${index + 1}: dates incohérentes`);
        }
      });
    }

    if (merged.experience) {
      merged.experience.forEach((exp, index) => {
        if (exp.startYear && exp.endYear && exp.endYear < exp.startYear && !exp.isCurrent) {
          validation.issues.push(`Expérience ${index + 1}: dates incohérentes`);
        }
      });
    }

    // Recommandations
    if (!merged.summary || merged.summary.length < 100) {
      validation.recommendations.push('Ajouter un résumé professionnel plus complet');
    }

    if (!merged.education || merged.education.length === 0) {
      validation.recommendations.push('Ajouter au moins une formation');
    }

    if (!merged.skills?.technical || merged.skills.technical.length < 3) {
      validation.recommendations.push('Ajouter plus de compétences techniques');
    }

    merged.validation = validation;
    return merged;
  }

  /**
   * Générer des suggestions d'amélioration
   */
  async generateSuggestions(profile) {
    try {
      const prompt = `Analyse ce profil et génère des suggestions d'amélioration:
      
      PROFIL:
      ${JSON.stringify(profile, null, 2)}
      
      Généres des suggestions:
      1. Pour améliorer le CV
      2. Pour optimiser le profil LinkedIn
      3. Pour compléter les informations manquantes
      4. Pour mettre en valeur les points forts
      
      Réponds au format JSON:
      {
        "cvImprovements": ["string"],
        "linkedinOptimizations": ["string"],
        "missingInfo": ["string"],
        "strengthsToHighlight": ["string"]
      }`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en optimisation de profil professionnel."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Suggestion generation error:', error);
      return {
        cvImprovements: [],
        linkedinOptimizations: [],
        missingInfo: [],
        strengthsToHighlight: []
      };
    }
  }

  /**
   * Calculer la confiance dans les données fusionnées
   */
  calculateConfidence(data) {
    let score = 0;
    let maxScore = 0;

    // Personal info (30 points)
    maxScore += 30;
    if (data.personal?.firstName && data.personal?.lastName) score += 10;
    if (data.personal?.email?.length > 0) score += 10;
    if (data.personal?.phone?.length > 0) score += 5;
    if (data.personal?.address) score += 5;

    // Education (20 points)
    maxScore += 20;
    if (data.education?.length > 0) {
      score += Math.min(20, data.education.length * 4);
    }

    // Experience (30 points)
    maxScore += 30;
    if (data.experience?.length > 0) {
      score += Math.min(30, data.experience.length * 6);
    }

    // Skills (20 points)
    maxScore += 20;
    if (data.skills?.technical?.length > 0) {
      score += Math.min(20, data.skills.technical.length);
    }

    return {
      score: Math.round((score / maxScore) * 100),
      breakdown: {
        personal: data.personal ? 30 : 0,
        education: data.education?.length > 0 ? 20 : 0,
        experience: data.experience?.length > 0 ? 30 : 0,
        skills: data.skills?.technical?.length > 0 ? 20 : 0
      }
    };
  }

  /**
   * Détecter les conflits entre sources
   */
  detectConflicts(datasets) {
    const conflicts = [];

    // Comparer les datasets deux à deux
    const sources = Object.keys(datasets).filter(k => datasets[k]);
    
    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const sourceA = sources[i];
        const sourceB = sources[j];
        const dataA = datasets[sourceA];
        const dataB = datasets[sourceB];

        // Vérifier les conflits de noms
        if (dataA.personal?.firstName && dataB.personal?.firstName &&
            dataA.personal.firstName !== dataB.personal.firstName) {
          conflicts.push({
            field: 'personal.firstName',
            sources: [sourceA, sourceB],
            values: [dataA.personal.firstName, dataB.personal.firstName],
            resolvedWith: sourceA // Priorité à la première source
          });
        }

        // Vérifier les conflits de dates d'expérience
        if (dataA.experience && dataB.experience) {
          dataA.experience.forEach((expA, idxA) => {
            dataB.experience.forEach((expB, idxB) => {
              if (expA.company === expB.company && expA.jobTitle === expB.jobTitle) {
                if (expA.startYear !== expB.startYear || expA.endYear !== expB.endYear) {
                  conflicts.push({
                    field: `experience[${idxA}].dates`,
                    sources: [sourceA, sourceB],
                    values: [`${expA.startYear}-${expA.endYear}`, `${expB.startYear}-${expB.endYear}`],
                    resolvedWith: sourceA
                  });
                }
              }
            });
          });
        }
      }
    }

    return conflicts;
  }
}

module.exports = new DataEnhancerAgent();