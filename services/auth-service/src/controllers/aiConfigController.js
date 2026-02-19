const AIConfig = require('../models/AIConfig');

// Récupérer toutes les configs
exports.getAllConfigs = async (req, res) => {
  try {
    const configs = await AIConfig.findAll({
      include: [
        {
          association: 'modifiedByUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('Erreur getAllConfigs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des configurations',
      error: error.message
    });
  }
};

// Récupérer une config par service
exports.getConfigByService = async (req, res) => {
  try {
    const { serviceName } = req.params;

    const config = await AIConfig.findOne({
      where: { serviceName, isActive: true },
      include: [
        {
          association: 'modifiedByUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: `Aucune configuration active trouvée pour le service: ${serviceName}`
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Erreur getConfigByService:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la configuration',
      error: error.message
    });
  }
};

// Créer ou mettre à jour une config
exports.upsertConfig = async (req, res) => {
  try {
    const { serviceName, modelName, apiKey, provider, notes } = req.body;

    if (!serviceName || !modelName || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'serviceName, modelName et apiKey sont requis'
      });
    }

    const [config, created] = await AIConfig.findOrCreate({
      where: { serviceName },
      defaults: {
        modelName,
        apiKey,
        provider: provider || 'openrouter',
        isActive: true,
        lastModifiedBy: req.user.id,
        notes
      }
    });

    if (!created) {
      await config.update({
        modelName,
        apiKey,
        provider: provider || config.provider,
        lastModifiedBy: req.user.id,
        notes
      });
    }

    const updatedConfig = await AIConfig.findByPk(config.id, {
      include: [
        {
          association: 'modifiedByUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Configuration créée' : 'Configuration mise à jour',
      data: updatedConfig
    });
  } catch (error) {
    console.error('Erreur upsertConfig:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la sauvegarde de la configuration',
      error: error.message
    });
  }
};

// Supprimer une config
exports.deleteConfig = async (req, res) => {
  try {
    const { configId } = req.params;

    const config = await AIConfig.findByPk(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration non trouvée'
      });
    }

    await config.destroy();

    res.json({
      success: true,
      message: 'Configuration supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur deleteConfig:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message
    });
  }
};

// Config globale (publique)
exports.getGlobalConfigPublic = async (req, res) => {
  try {
    const config = await AIConfig.findOne({ where: { serviceName: 'global', isActive: true } });
    if (config) {
      console.log(`🟢 Global config found (public): ${config.modelName} | ${config.apiKey.slice(0, 6)}...`);
    } else {
      console.warn('🔴 Global config missing or inactive (public)');
    }
    return res.json({ success: true, data: config || null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getGlobalConfig = async (req, res) => {
  try {
    const config = await AIConfig.findOne({ where: { serviceName: 'global' } });
    return res.json({ success: true, data: config || null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.upsertGlobalConfig = async (req, res) => {
  try {
    const { modelName, apiKey, provider, notes } = req.body;

    console.log('🧩 Upsert global config request', {
      userId: req.user?.id || null,
      email: req.user?.email || null,
      provider: provider || 'openrouter',
      modelName: modelName || null,
      apiKeyPrefix: apiKey ? `${apiKey.slice(0, 6)}...` : null
    });

    if (!modelName || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'modelName et apiKey sont requis'
      });
    }

    const [config] = await AIConfig.findOrCreate({
      where: { serviceName: 'global' },
      defaults: {
        serviceName: 'global',
        modelName,
        apiKey,
        provider: provider || 'openrouter',
        notes,
        isActive: true,
        lastModifiedBy: req.user.id
      }
    });

    if (config && (modelName || apiKey || provider || notes)) {
      await config.update({
        modelName,
        apiKey,
        provider: provider || config.provider,
        notes,
        isActive: true,
        lastModifiedBy: req.user.id
      });
      console.log('✅ Config globale mise à jour avec succès:', {
        modelName: config.modelName,
        apiKeyPrefix: config.apiKey.slice(0, 10) + '...',
        provider: config.provider
      });
    }

    return res.json({ success: true, data: config });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleGlobalConfig = async (req, res) => {
  try {
    const { isActive } = req.body;
    const config = await AIConfig.findOne({ where: { serviceName: 'global' } });
    if (!config) return res.status(404).json({ success: false, message: 'Config globale introuvable' });
    await config.update({ isActive: !!isActive });
    return res.json({ success: true, data: config });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Activer/désactiver une config
exports.toggleConfigStatus = async (req, res) => {
  try {
    const { configId } = req.params;
    const { isActive } = req.body;

    const config = await AIConfig.findByPk(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration non trouvée'
      });
    }

    await config.update({
      isActive,
      lastModifiedBy: req.user.id
    });

    const updatedConfig = await AIConfig.findByPk(configId, {
      include: [
        {
          association: 'modifiedByUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: `Configuration ${isActive ? 'activée' : 'désactivée'}`,
      data: updatedConfig
    });
  } catch (error) {
    console.error('Erreur toggleConfigStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du statut',
      error: error.message
    });
  }
};