const User = require('./User');
const ProfileTutor = require('./ProfileTutor');
const ProfileStudent = require('./ProfileStudent');
const Diploma = require('./Diploma');
const Experience = require('./Experience');
const Annonce = require('./Annonce');
const AnnonceEmbedding = require('./AnnonceEmbedding');
const Review = require('./Review');

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

// Associations User - Expériences
User.hasMany(Experience, {
  foreignKey: 'userId',
  as: 'experiences',
  onDelete: 'CASCADE'
});

Experience.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// ProfileTutor - Annonces
ProfileTutor.hasMany(Annonce, {
  foreignKey: 'tutorId',
  as: 'annonces',
  onDelete: 'CASCADE'
});

Annonce.belongsTo(ProfileTutor, {
  foreignKey: 'tutorId',
  as: 'tutor'
});

// Association Annonce - AnnonceEmbedding
Annonce.hasOne(AnnonceEmbedding, {
  foreignKey: 'annonceId',
  as: 'embedding',
  onDelete: 'CASCADE'
});

AnnonceEmbedding.belongsTo(Annonce, {
  foreignKey: 'annonceId',
  as: 'annonce'
});

// Review Associations
User.hasMany(Review, {
  foreignKey: 'reviewerId',
  as: 'reviewsGiven',
  onDelete: 'CASCADE'
});

Review.belongsTo(User, {
  foreignKey: 'reviewerId',
  as: 'reviewer'
});

User.hasMany(Review, {
  foreignKey: 'targetUserId',
  as: 'reviewsReceived',
  onDelete: 'CASCADE'
});

Review.belongsTo(User, {
  foreignKey: 'targetUserId',
  as: 'target'
});

module.exports = {
  User,
  ProfileTutor,
  ProfileStudent,
  Diploma,
  Experience,
  Annonce,
  AnnonceEmbedding,
  Review
};