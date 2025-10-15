const User = require('./User');
const ProfileTutor = require('./ProfileTutor');
const ProfileStudent = require('./ProfileStudent');

// Définir les associations
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

module.exports = {
  User,
  ProfileTutor,
  ProfileStudent
};