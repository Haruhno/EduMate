const User = require('./User');
const ProfileTutor = require('./ProfileTutor');
const ProfileStudent = require('./ProfileStudent');
const Diploma = require('./Diploma');
const Experience = require('./Experience');

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

// NOUVELLE ASSOCIATION : User - Expériences
User.hasMany(Experience, {
  foreignKey: 'userId',
  as: 'experiences',
  onDelete: 'CASCADE'
});

Experience.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

module.exports = {
  User,
  ProfileTutor,
  ProfileStudent,
  Diploma,
  Experience
};