// models/associations.js
const User = require('./User');
const ProfileTutor = require('./ProfileTutor');
const ProfileStudent = require('./ProfileStudent');
const Diploma = require('./Diploma');

// Associations User - Profil
User.hasOne(ProfileTutor, { 
  foreignKey: 'userId', 
  as: 'tutorProfile',
  onDelete: 'CASCADE'
});

User.hasOne(ProfileStudent, { 
  foreignKey: 'userId', 
  as: 'studentProfile',
  onDelete: 'CASCADE'
});

ProfileTutor.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

ProfileStudent.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Associations User - Diplômes
User.hasMany(Diploma, {
  foreignKey: 'userId',
  as: 'diplomas',
  onDelete: 'CASCADE'
});

Diploma.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

module.exports = {
  User,
  ProfileTutor,
  ProfileStudent,
  Diploma
};