// routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/:filename', async (req, res) => {
  try {
    const bucket = new mongoose.mongo.GridFSBucket(
      mongoose.connection.db,
      { bucketName: 'uploads' }
    );

    const file = await mongoose.connection.db
      .collection('uploads.files')
      .findOne({ filename: req.params.filename });

    if (!file) return res.status(404).json({ message: 'Fichier non trouvé' });

    res.set('Content-Type', file.contentType || 'application/octet-stream');

    const stream = bucket.openDownloadStreamByName(file.filename);
    stream.pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lecture fichier' });
  }
});

module.exports = router;
