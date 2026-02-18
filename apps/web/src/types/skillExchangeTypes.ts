export interface Skill {
  id: string;
  name: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  description?: string;
}

export interface SkillExchangeRequest {
  id: string;
  studentId: string;
  tutorId: string;
  skillOffered: Skill;
  skillRequested: Skill;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface UserWithSkills {
  id: string;
  firstName: string;
  lastName: string;
  skillsToTeach: Skill[];
  skillsToLearn: Skill[];
}
