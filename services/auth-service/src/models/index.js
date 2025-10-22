// services/auth-service/src/models/index.js
const User = require('./User');
const ProfileTutor = require('./ProfileTutor');
const ProfileStudent = require('./ProfileStudent');
const Diploma = require('./Diploma');

// Importez les associations
require('./associations');

module.exports = {
  User,
  ProfileTutor,
  ProfileStudent,
  Diploma
};