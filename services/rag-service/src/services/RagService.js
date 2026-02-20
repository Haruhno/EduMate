const { generateEmbedding } = require('../config/embedding');
const { client, COLLECTION_NAME } = require('../config/qdrant');
const db = require('../config/database');

console.log('🔄 Chargement RagService PRO (sans bidouilles)...');

class RagService {
  /**
   * INDEXATION PRO - Texte naturel
   */
  async indexAnnonce(annonceData) {
    try {
      // 1. Texte NATUREL pour l'embedding (pas de préparation spéciale)
      const naturalText = [
        annonceData.title || '',
        annonceData.description || '',
        (annonceData.subjects || []).join(' ') || ''
      ].filter(text => text.trim().length > 0).join('. ');
      
      console.log(`📝 Indexation: "${annonceData.title?.substring(0, 40)}..."`);
      
      // 2. Embedding DIRECT
      const embedding = await generateEmbedding(naturalText);
      
      // 3. Payload simple
      const payload = {
        annonceId: annonceData.id,
        tutorId: annonceData.tutorId,
        title: annonceData.title,
        description: annonceData.description,
        subjects: annonceData.subjects || [],
        level: annonceData.level,
        hourlyRate: parseFloat(annonceData.hourlyRate) || 0,
        teachingMode: annonceData.teachingMode,
        location: annonceData.location || {},
        tutorName: annonceData.tutorName || '',
        tutorRating: parseFloat(annonceData.tutorRating) || 0,
        tutorSkillsToLearn: annonceData.tutorSkillsToLearn || [],
        profilePicture: annonceData.profilePicture || ''
      };
      
      // 4. Upsert dans Qdrant
      await client.upsert(COLLECTION_NAME, {
        wait: true,
        points: [{
          id: annonceData.id,
          vector: embedding,
          payload: payload
        }]
      });
      
      console.log(`✅ Indexé`);
      return true;
      
    } catch (error) {
      console.error('❌ Erreur indexation:', error.message);
      throw error;
    }
  }

  /**
   * RECHERCHE SÉMANTIQUE PRO - Similarité vectorielle pure
   */
  async semanticSearch(query, filters = {}, limit = 10) {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 [PRO] Recherche: "${query}"`);
      
      // 1. EMBEDDING DIRECT de la requête COMPLÈTE
      // Pas de nettoyage, pas d'extraction, pas d'enrichissement
      const queryEmbedding = await generateEmbedding(query);
      console.log(`✅ Embedding généré`);
      
      // 2. RECHERCHE VECTORIELLE PURE dans Qdrant
      const searchParams = {
        vector: queryEmbedding,
        limit: Math.min(limit * 3, 30), // Chercher large
        with_payload: true,
        with_vector: false,
        score_threshold: 0.65, 
        filter: this.buildQdrantFilter(filters)
      };
      
      const results = await client.search(COLLECTION_NAME, searchParams);
      
      // 3. FORMATAGE SIMPLE des résultats
      const formattedResults = results.map(item => ({
        annonceId: item.payload.annonceId,
        tutorId: item.payload.tutorId,
        title: item.payload.title,
        description: item.payload.description,
        subjects: item.payload.subjects || [],
        level: item.payload.level,
        hourlyRate: item.payload.hourlyRate,
        teachingMode: item.payload.teachingMode,
        location: item.payload.location,
        tutorName: item.payload.tutorName,
        tutorRating: item.payload.tutorRating,
        tutorSkillsToLearn: item.payload.tutorSkillsToLearn || [],
        profilePicture: item.payload.profilePicture || '',
        relevanceScore: item.score, // Score DIRECT de similarité cosinus
        matchType: 'semantic'
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
      
      const duration = Date.now() - startTime;
      
      if (formattedResults.length > 0) {
        console.log(`✅ ${formattedResults.length} résultats (${duration}ms)`);
        console.log(`📈 Scores:`, formattedResults.map(r => r.relevanceScore.toFixed(3)));
      } else {
        console.log(`⚠️ 0 résultat sémantique (${duration}ms)`);
      }
      
      return formattedResults;
      
    } catch (error) {
      console.error('❌ Erreur recherche sémantique:', error.message);
      return []; // Retourner vide, pas de fallback automatique
    }
  }

  /**
   * RECHERCHE HYBRIDE PRO - Sémantique + Textuelle intelligente
   */
  async hybridSearch(query, filters = {}, limit = 10) {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 [HYBRIDE PRO] "${query}"`);
      
      // 1. Recherche sémantique en PARALLÈLE avec textuelle
      const [semanticResults, textResults] = await Promise.all([
        this.semanticSearch(query, filters, limit * 2),
        this.textSearch(query, filters, limit * 2)
      ]);
      
      // 2. FUSION INTELLIGENTE (pas de bonus manuels)
      const allResults = this.mergeResultsPro(semanticResults, textResults, limit);
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${allResults.length} résultats hybrides (${duration}ms)`);
      
      return allResults;
      
    } catch (error) {
      console.error('❌ Erreur recherche hybride:', error.message);
      return await this.textSearch(query, filters, limit);
    }
  }

  /**
   * FUSION PRO des résultats - Logique simple
   */
  mergeResultsPro(semanticResults, textResults, limit) {
    const resultMap = new Map();
    
    // Priorité 1: Résultats sémantiques avec bon score
    semanticResults.forEach(result => {
      if (result.relevanceScore >= 0.6) {
        resultMap.set(result.annonceId, {
          ...result,
          source: 'semantic',
          combinedScore: result.relevanceScore
        });
      }
    });
    
    // Priorité 2: Résultats textuels pour compléter
    textResults.forEach(result => {
      if (!resultMap.has(result.annonceId)) {
        resultMap.set(result.annonceId, {
          ...result,
          source: 'text',
          combinedScore: 0.5 // Score fixe pour textuel
        });
      }
    });
    
    // Trier par score combiné
    return Array.from(resultMap.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, limit);
  }

  /**
   * FILTRES QDRANT - Basique
   */
  buildQdrantFilter(filters) {
    const must = [];
    
    if (filters.level && filters.level.trim()) {
      must.push({ key: 'level', match: { value: filters.level } });
    }
    
    if (filters.teachingMode && filters.teachingMode.trim()) {
      must.push({ key: 'teachingMode', match: { value: filters.teachingMode } });
    }
    
    const priceRange = {};
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      priceRange.gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      priceRange.lte = filters.maxPrice;
    }
    
    if (Object.keys(priceRange).length > 0) {
      must.push({ key: 'hourlyRate', range: priceRange });
    }
    
    return must.length > 0 ? { must } : undefined;
  }

  /**
   * RECHERCHE TEXTUELLE - Keep it simple
   */
  async textSearch(query, filters = {}, limit = 20) {
    try {
      let sql = `
        SELECT 
          a.id as "annonceId",
          a."tutorId",
          a.title,
          a.description,
          a.subjects,
          a.level,
          a."hourlyRate",
          a."teachingMode",
          a.location,
          COALESCE(CONCAT(u."firstName", ' ', u."lastName"), 'Tuteur') as "tutorName",
          COALESCE(t.rating, 0) as "tutorRating",
          COALESCE(t."profilePicture", '') as "profilePicture", 
          COALESCE(u."skillsToLearn", '[]'::jsonb) as "tutorSkillsToLearn",
          0.5 as "relevanceScore",
          'text' as "matchType"
        FROM annonces a
        LEFT JOIN profile_tutors t ON a."tutorId" = t.id
        LEFT JOIN users u ON t."userId" = u.id
        WHERE a."isActive" = true
      `;
      
      const params = [];
      let paramCount = 0;
      
      if (query && query.trim()) {
        sql += ` AND (
          a.title ILIKE $${paramCount + 1}
          OR a.description ILIKE $${paramCount + 1}
          OR EXISTS (
            SELECT 1 FROM unnest(a.subjects) as subject
            WHERE subject ILIKE $${paramCount + 1}
          )
        )`;
        params.push(`%${query}%`);
        paramCount++;
      }
      
      if (filters.minPrice !== undefined && filters.minPrice > 0) {
        sql += ` AND a."hourlyRate" >= $${paramCount + 1}`;
        params.push(parseFloat(filters.minPrice));
        paramCount++;
      }
      
      if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
        sql += ` AND a."hourlyRate" <= $${paramCount + 1}`;
        params.push(parseFloat(filters.maxPrice));
        paramCount++;
      }
      
      sql += ` ORDER BY t.rating DESC, a."createdAt" DESC LIMIT $${paramCount + 1}`;
      params.push(limit);
      
      const result = await db.query(sql, params);
      
      return result.rows;
      
    } catch (error) {
      console.error('❌ Erreur recherche textuelle:', error.message);
      return [];
    }
  }

  // ============ MÉTHODES UTILITAIRES SIMPLES ============

  /**
   * Recherche par compétence - Version simple
   */
  async searchBySkill(skill, limit = 10) {
    // Juste appeler semanticSearch avec la compétence
    return await this.semanticSearch(skill, {}, limit);
  }

  /**
   * Échange de compétences - Version simple
   */
  async findSkillExchange(userSkills) {
    try {
      const { skillsToTeach = [], skillsToLearn = [] } = userSkills;
      
      if (skillsToLearn.length === 0) return [];
      
      const exchangeMatches = [];
      
      for (const skillToLearn of skillsToLearn) {
        const tutors = await this.searchBySkill(skillToLearn, 10);
        
        for (const tutor of tutors) {
          const tutorWantsToLearn = tutor.tutorSkillsToLearn || [];
          const matchingSkills = tutorWantsToLearn.filter(tutorSkill =>
            skillsToTeach.some(userSkill =>
              userSkill.toLowerCase().includes(tutorSkill.toLowerCase()) ||
              tutorSkill.toLowerCase().includes(userSkill.toLowerCase())
            )
          );
          
          if (matchingSkills.length > 0) {
            exchangeMatches.push({
              tutorId: tutor.tutorId,
              tutorName: tutor.tutorName,
              teaches: skillToLearn,
              wantsToLearn: matchingSkills,
              matchScore: matchingSkills.length * 0.5 + (tutor.tutorRating / 5) * 0.5,
              annonceId: tutor.annonceId,
              title: tutor.title,
              relevanceScore: tutor.relevanceScore
            });
          }
        }
      }
      
      return exchangeMatches.sort((a, b) => b.matchScore - a.matchScore);
      
    } catch (error) {
      console.error('❌ Erreur échange compétences:', error);
      return [];
    }
  }

  /**
   * Supprimer une annonce
   */
  async deleteAnnonce(annonceId) {
    try {
      await client.delete(COLLECTION_NAME, {
        filter: {
          must: [{ key: 'annonceId', match: { value: annonceId } }]
        }
      });
      console.log(`🗑️ Supprimé: ${annonceId}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      return false;
    }
  }
}

module.exports = new RagService();