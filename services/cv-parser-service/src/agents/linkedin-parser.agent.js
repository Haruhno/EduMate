const { OpenAI } = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');

class LinkedInParserAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Extraire les données d'un profil LinkedIn
   */
  async scrapeLinkedInProfile(linkedinUrl) {
    try {
      // 1. Récupérer le contenu HTML
      const html = await this.fetchLinkedInHTML(linkedinUrl);
      
      // 2. Parser le HTML avec Cheerio
      const $ = cheerio.load(html);
      
      // 3. Extraire les sections principales
      const profileData = {
        personal: this.extractPersonalInfo($),
        summary: this.extractSummary($),
        experience: this.extractExperience($),
        education: this.extractEducation($),
        skills: this.extractSkills($),
        certifications: this.extractCertifications($),
        projects: this.extractProjects($)
      };

      // 4. Nettoyage et validation avec IA
      const cleanedData = await this.cleanWithAI(profileData);

      // 5. Enrichissement des données
      const enrichedData = await this.enrichLinkedInData(cleanedData);

      return {
        success: true,
        data: enrichedData,
        metadata: {
          source: 'linkedin',
          url: linkedinUrl,
          extractionDate: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('LinkedIn scraping error:', error);
      throw new Error(`Erreur lors de l'extraction LinkedIn: ${error.message}`);
    }
  }

  /**
   * Récupérer le HTML de LinkedIn
   */
  async fetchLinkedInHTML(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      throw new Error(`Impossible d'accéder au profil LinkedIn: ${error.message}`);
    }
  }

  /**
   * Extraire les informations personnelles
   */
  extractPersonalInfo($) {
    const personalInfo = {
      firstName: $('h1.text-heading-xlarge').text().trim().split(' ')[0],
      lastName: $('h1.text-heading-xlarge').text().trim().split(' ').slice(1).join(' '),
      headline: $('div.text-body-medium').first().text().trim(),
      location: $('span.text-body-small.inline.t-black--light.break-words').first().text().trim(),
    };

    // Extraire l'image de profil
    const profileImage = $('img.pv-top-card-profile-picture__image').attr('src');
    if (profileImage) {
      personalInfo.profileImage = profileImage;
    }

    // Extraire les contacts
    $('.pv-contact-info__contact-item').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.includes('@')) {
        personalInfo.email = text;
      } else if (text.match(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)) {
        personalInfo.phone = text;
      }
    });

    return personalInfo;
  }

  /**
   * Extraire le résumé
   */
  extractSummary($) {
    return $('section.pv-about-section .pv-about__summary-text').text().trim() || 
           $('div#about ~ .display-flex').text().trim();
  }

  /**
   * Extraire l'expérience professionnelle
   */
  extractExperience($) {
    const experiences = [];
    
    $('#experience-section ul > li').each((i, elem) => {
      const experience = {
        jobTitle: $(elem).find('h3').first().text().trim(),
        company: $(elem).find('span.t-14.t-normal').first().text().trim(),
        location: $(elem).find('span.t-14.t-normal.t-black--light').first().text().trim(),
        duration: $(elem).find('span.t-14.t-normal.t-black--light').last().text().trim(),
        description: $(elem).find('p.pv-entity__description').text().trim()
      };

      // Parser la durée pour extraire dates
      const dates = this.parseDuration(experience.duration);
      if (dates) {
        experience.startDate = dates.startDate;
        experience.endDate = dates.endDate;
        experience.isCurrent = dates.isCurrent;
      }

      if (experience.jobTitle && experience.company) {
        experiences.push(experience);
      }
    });

    return experiences;
  }

  /**
   * Extraire la formation
   */
  extractEducation($) {
    const education = [];
    
    $('#education-section ul > li').each((i, elem) => {
      const edu = {
        school: $(elem).find('h3').first().text().trim(),
        degree: $(elem).find('span.t-14.t-normal').first().text().trim(),
        field: $(elem).find('span.t-14.t-normal').eq(1).text().trim(),
        duration: $(elem).find('span.t-14.t-normal.t-black--light').first().text().trim(),
        description: $(elem).find('p.pv-entity__description').text().trim()
      };

      const dates = this.parseDuration(edu.duration);
      if (dates) {
        edu.startYear = dates.startDate ? new Date(dates.startDate).getFullYear() : null;
        edu.endYear = dates.endDate ? new Date(dates.endDate).getFullYear() : null;
        edu.isCurrent = dates.isCurrent;
      }

      if (edu.school && edu.degree) {
        education.push(edu);
      }
    });

    return education;
  }

  /**
   * Extraire les compétences
   */
  extractSkills($) {
    const skills = {
      technical: [],
      endorsements: {}
    };

    $('.pv-skill-category-entity__skill-wrapper').each((i, elem) => {
      const skill = $(elem).find('.pv-skill-category-entity__name-text').text().trim();
      const endorsements = $(elem).find('.pv-skill-category-entity__endorsement-count').text().trim();
      
      if (skill) {
        skills.technical.push(skill);
        if (endorsements) {
          skills.endorsements[skill] = parseInt(endorsements) || 0;
        }
      }
    });

    return skills;
  }

  /**
   * Extraire les certifications
   */
  extractCertifications($) {
    const certifications = [];
    
    $('.certification-item').each((i, elem) => {
      const cert = {
        name: $(elem).find('h3').text().trim(),
        issuer: $(elem).find('span.t-14.t-normal').first().text().trim(),
        issueDate: $(elem).find('span.t-14.t-normal.t-black--light').first().text().trim()
      };

      if (cert.name && cert.issuer) {
        certifications.push(cert);
      }
    });

    return certifications;
  }

  /**
   * Extraire les projets
   */
  extractProjects($) {
    const projects = [];
    
    $('.project-item').each((i, elem) => {
      const project = {
        name: $(elem).find('h3').text().trim(),
        duration: $(elem).find('span.t-14.t-normal.t-black--light').first().text().trim(),
        description: $(elem).find('p.pv-entity__description').text().trim()
      };

      if (project.name) {
        projects.push(project);
      }
    });

    return projects;
  }

  /**
   * Parser la durée (ex: "janv. 2020 - aujourd'hui")
   */
  parseDuration(durationText) {
    if (!durationText) return null;

    const months = {
      'janv': 1, 'févr': 2, 'mars': 3, 'avr': 4, 'mai': 5, 'juin': 6,
      'juil': 7, 'août': 8, 'sept': 9, 'oct': 10, 'nov': 11, 'déc': 12
    };

    const today = new Date();
    const parts = durationText.toLowerCase().split(' - ');
    
    if (parts.length !== 2) return null;

    const parseDate = (dateStr) => {
      if (dateStr.includes('aujourd\'hui') || dateStr.includes('présent')) {
        return {
          date: today,
          isCurrent: true
        };
      }

      const [monthStr, yearStr] = dateStr.split(' ');
      const month = months[monthStr];
      const year = parseInt(yearStr);

      if (month && year) {
        return {
          date: new Date(year, month - 1, 1),
          isCurrent: false
        };
      }

      return null;
    };

    const start = parseDate(parts[0].trim());
    const end = parseDate(parts[1].trim());

    if (start && end) {
      return {
        startDate: start.date,
        endDate: end.date,
        isCurrent: end.isCurrent
      };
    }

    return null;
  }

  /**
   * Nettoyer avec IA
   */
  async cleanWithAI(data) {
    try {
      const prompt = `Nettoye et structure ces données LinkedIn:
      
      DONNÉES BRUTES:
      ${JSON.stringify(data, null, 2)}
      
      RÈGLES:
      1. Normalise les formats (dates, téléphones)
      2. Supprime les doublons
      3. Structure en JSON cohérent
      4. Valide les emails
      5. Capitalise correctement les noms
      
      Réponds UNIQUEMENT au format JSON structuré.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Tu es un assistant qui nettoie et structure des données LinkedIn."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI cleaning error:', error);
      return data;
    }
  }

  /**
   * Enrichir les données LinkedIn
   */
  async enrichLinkedInData(data) {
    // Ajouter des métadonnées et valider
    return {
      ...data,
      metadata: {
        source: 'linkedin',
        extractionDate: new Date().toISOString(),
        dataQuality: this.assessDataQuality(data)
      },
      suggestions: this.generateSuggestions(data)
    };
  }

  /**
   * Évaluer la qualité des données
   */
  assessDataQuality(data) {
    let score = 100;
    const issues = [];

    // Vérifier la complétude
    if (!data.personal?.firstName || !data.personal?.lastName) {
      score -= 30;
      issues.push('Nom/prénom manquant');
    }

    if (!data.experience?.length) {
      score -= 20;
      issues.push('Aucune expérience');
    }

    if (!data.education?.length) {
      score -= 20;
      issues.push('Aucune formation');
    }

    if (!data.skills?.technical?.length) {
      score -= 10;
      issues.push('Aucune compétence');
    }

    return {
      score: Math.max(0, score),
      rating: score >= 80 ? 'EXCELLENT' : 
              score >= 60 ? 'GOOD' : 
              score >= 40 ? 'FAIR' : 'POOR',
      issues
    };
  }

  /**
   * Générer des suggestions d'amélioration
   */
  generateSuggestions(data) {
    const suggestions = [];

    if (data.experience?.length < 2) {
      suggestions.push('Ajoutez plus de détails sur vos expériences professionnelles');
    }

    if (data.skills?.technical?.length < 5) {
      suggestions.push('Ajoutez des compétences spécifiques avec des exemples concrets');
    }

    if (!data.summary || data.summary.length < 150) {
      suggestions.push('Rédigez un résumé professionnel plus complet');
    }

    return suggestions;
  }
}

module.exports = new LinkedInParserAgent();