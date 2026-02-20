const db = require('../config/database');
const ragService = require('./RagService');

class SyncService {
  /**
   * Synchroniser toutes les annonces existantes
   */
  async syncExistingData() {
    try {
      console.log('Synchronisation des annonces depuis PostgreSQL...');
      
      // Récupérer toutes les annonces actives
      const sql = `
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
          t."profilePicture" as "profilePicture", 
          u."skillsToLearn" as "tutorSkillsToLearn"
        FROM annonces a
        JOIN profile_tutors t ON a."tutorId" = t.id
        JOIN users u ON t."userId" = u.id
        WHERE 1=1
        ORDER BY a."createdAt" DESC
      `;
      
      const result = await db.query(sql);
      const annonces = result.rows;
      
      console.log(`📥 ${annonces.length} annonces à synchroniser`);
      
      // Indexer chaque annonce
      let successCount = 0;
      let errorCount = 0;
      
      for (const annonce of annonces) {
        try {
          await ragService.indexAnnonce(annonce);
          successCount++;
        } catch (error) {
          console.error(`❌ Erreur synchro annonce ${annonce.id}:`, error.message);
          errorCount++;
        }
        
        // Petite pause pour ne pas surcharger l'API OpenAI
        if (successCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`✅ Synchronisation terminée: ${successCount} succès, ${errorCount} erreurs`);
      
      return { successCount, errorCount };
      
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      throw error;
    }
  }
  
  /**
   * Synchroniser une seule annonce
   */
  async syncSingleAnnonce(annonceId) {
    try {
      const sql = `
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
        WHERE a.id = $1
      `;
      
      const result = await db.query(sql, [annonceId]);
      
      if (result.rows.length === 0) {
        console.log(`⚠️ Annonce ${annonceId} non trouvée`);
        return false;
      }
      
      await ragService.indexAnnonce(result.rows[0]);
      console.log(`✅ Annonce ${annonceId} synchronisée`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Erreur synchro annonce unique:', error);
      return false;
    }
  }
  
  /**
   * Synchroniser par lot (pour webhook ou cron job)
   */
  async syncBatch(annonceIds) {
    try {
      if (!annonceIds || annonceIds.length === 0) {
        return { success: 0, failed: 0 };
      }
      
      const sql = `
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
        WHERE a.id = ANY($1)
      `;
      
      const result = await db.query(sql, [annonceIds]);
      const annonces = result.rows;
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const annonce of annonces) {
        try {
          await ragService.indexAnnonce(annonce);
          successCount++;
        } catch (error) {
          console.error(`❌ Erreur synchro annonce ${annonce.id}:`, error.message);
          errorCount++;
        }
      }
      
      console.log(`✅ Batch synchronisé: ${successCount} succès, ${errorCount} erreurs`);
      
      return { success: successCount, failed: errorCount };
      
    } catch (error) {
      console.error('❌ Erreur synchro batch:', error);
      return { success: 0, failed: 0 };
    }
  }
}

module.exports = new SyncService();