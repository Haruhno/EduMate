const ragService = require('../services/RagService');

class SearchController {
  /**
   * GET /api/search/semantic
   */
  async semanticSearch(req, res) {
    try {
      const { q: query, level, minPrice, maxPrice, teachingMode, location, limit = 10 } = req.query;
      
      console.log('📨 [API] GET /api/search/semantic');
      console.log('  Query:', query);
      console.log('  Limit:', limit);
      
      if (!query) {
        console.log('❌ [API] Query manquante');
        return res.status(400).json({
          success: false,
          message: 'Paramètre "q" requis',
          data: { results: [], total: 0 }
        });
      }
      
      const filters = {};
      if (level) filters.level = level;
      if (minPrice !== undefined) filters.minPrice = parseFloat(minPrice);
      if (maxPrice !== undefined) filters.maxPrice = parseFloat(maxPrice);
      if (teachingMode) filters.teachingMode = teachingMode;
      if (location) filters.location = location;
      
      console.log('🔧 Filtres:', filters);
      
      // Appeler le service RAG
      console.log('🔄 Appel ragService.semanticSearch...');
      const results = await ragService.semanticSearch(query, filters, parseInt(limit));
      
      console.log(`✅ [API] ${results.length} résultats trouvés`);
      
      if (!Array.isArray(results)) {
        throw new Error('RAG retourna un format invalide: ' + typeof results);
      }
      
      const response = {
        success: true,
        message: `${results.length} annonces trouvées`,
        data: {
          results: results,
          query: query,
          filters: filters,
          total: results.length,
          limit: parseInt(limit)
        },
        metadata: {
          searchType: 'semantic',
          timestamp: new Date().toISOString()
        }
      };
      
      console.log('📤 Réponse:', { 
        success: response.success, 
        total: response.data.total,
        resultsLength: response.data.results?.length 
      });
      
      return res.json(response);
      
    } catch (error) {
      console.error('❌ [API] Erreur semanticSearch:', error);
      console.error('  Message:', error.message);
      console.error('  Stack:', error.stack);
      
      return res.status(500).json({
        success: false,
        message: `Erreur: ${error.message}`,
        data: { results: [], total: 0 }
      });
    }
  }

  /**
   * POST /api/search/exchange
   */
  async skillExchange(req, res) {
    try {
      const { skillsToTeach = [], skillsToLearn = [] } = req.body;
      
      console.log('📨 [API] POST /api/search/exchange');
      console.log('  skillsToTeach:', skillsToTeach);
      console.log('  skillsToLearn:', skillsToLearn);
      
      if (!Array.isArray(skillsToLearn) || skillsToLearn.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'skillsToLearn requis (array non vide)',
          data: []
        });
      }
      
      const results = await ragService.findSkillExchange({ skillsToTeach, skillsToLearn });
      
      console.log(`✅ [API] ${results.length} échanges trouvés`);
      
      return res.json({
        success: true,
        message: `${results.length} échanges trouvés`,
        data: results,
        metadata: {
          searchType: 'skillExchange',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ [API] Erreur skillExchange:', error.message);
      return res.status(500).json({
        success: false,
        message: `Erreur: ${error.message}`,
        data: []
      });
    }
  }

  /**
   * POST /api/search/sync
   */
  async syncAnnonces(req, res) {
    try {
      console.log('📨 [API] POST /api/search/sync');
      
      const db = require('../config/database');
      const result = await db.query(`
        SELECT 
          a.id,
          a."tutorId",
          a.title,
          a.description,
          a.subjects,
          a.level,
          a."hourlyRate",
          a."teachingMode",
          a.location,
          CONCAT(u."firstName", ' ', u."lastName") as "tutorName",
          t.rating as "tutorRating",
          u."skillsToLearn" as "tutorSkillsToLearn"
        FROM annonces a
        JOIN profile_tutors t ON a."tutorId" = t.id
        JOIN users u ON t."userId" = u.id
        WHERE a."isActive" = true AND t."isVerified" = true
      `);
      
      const annonces = result.rows;
      console.log(`📥 [API] ${annonces.length} annonces à indexer`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const annonce of annonces) {
        try {
          await ragService.indexAnnonce(annonce);
          successCount++;
        } catch (indexError) {
          console.error(`⚠️ Erreur ${annonce.id}:`, indexError.message);
          errorCount++;
        }
      }
      
      console.log(`✅ [API] Sync: ${successCount} OK, ${errorCount} erreurs`);
      
      return res.json({
        success: true,
        message: `${successCount} indexées, ${errorCount} erreurs`,
        data: { total: annonces.length, success: successCount, failed: errorCount }
      });
      
    } catch (error) {
      console.error('❌ [API] Erreur sync:', error.message);
      return res.status(500).json({
        success: false,
        message: `Erreur: ${error.message}`,
        data: null
      });
    }
  }
}

module.exports = new SearchController();