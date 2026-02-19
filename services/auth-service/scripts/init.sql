-- EduMate PostgreSQL Initialization Script
-- This runs automatically when the PostgreSQL container starts

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create ENUM types
CREATE TYPE teaching_mode AS ENUM ('En ligne', 'En présentiel', 'Les deux');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  "firstName" VARCHAR(255) NOT NULL,
  "lastName" VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'student',
  "isVerified" BOOLEAN DEFAULT true,
  phone VARCHAR(20),
  "countryCode" VARCHAR(5) DEFAULT '+33',
  gender VARCHAR(50),
  "birthDate" DATE,
  "skillsToTeach" JSONB DEFAULT '[]'::jsonb,
  "skillsToLearn" JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create profile_tutors table
CREATE TABLE IF NOT EXISTS profile_tutors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  rating DECIMAL(3, 2) DEFAULT 0.00,
  "reviewsCount" INTEGER DEFAULT 0,
  "profilePicture" TEXT,
  phone VARCHAR(20),
  "countryCode" VARCHAR(5) DEFAULT '+33',
  gender VARCHAR(50),
  "birthDate" DATE,
  address TEXT,
  experience TEXT,
  "educationLevel" VARCHAR(255),
  specialties TEXT[],
  certifications TEXT[],
  languages TEXT[],
  "hourlyRate" DECIMAL(10, 2),
  "teachingMode" VARCHAR(50) DEFAULT 'Les deux',
  "maxStudentsPerSession" INTEGER,
  availability JSONB DEFAULT '{}'::jsonb,
  "isVerified" BOOLEAN DEFAULT false,
  "isCompleted" BOOLEAN DEFAULT false,
  bio TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create profile_students table
CREATE TABLE IF NOT EXISTS profile_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  "learningStyle" VARCHAR(50),
  "preferredLanguage" VARCHAR(10),
  timezone VARCHAR(50),
  "coursesCompleted" INTEGER DEFAULT 0,
  "totalHoursLearned" DECIMAL(10, 2),
  metadata JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create annonces table
CREATE TABLE IF NOT EXISTS annonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tutorId" UUID NOT NULL REFERENCES profile_tutors(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  "rawText" TEXT,
  subject VARCHAR(255) NOT NULL,
  subjects TEXT[] NOT NULL,
  "detectedSkills" TEXT[] DEFAULT ARRAY[]::text[],
  level VARCHAR(100) NOT NULL,
  "hourlyRate" DECIMAL(10, 2) NOT NULL,
  "teachingMode" teaching_mode DEFAULT 'Les deux',
  location JSONB DEFAULT '{}'::jsonb,
  availability JSONB DEFAULT '{}'::jsonb,
  "isActive" BOOLEAN DEFAULT true,
  "isVerified" BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tutorId" UUID NOT NULL REFERENCES profile_tutors(id) ON DELETE CASCADE,
  "studentId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "bookingId" VARCHAR(255),
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  categories JSONB DEFAULT '{}'::jsonb,
  "isVisible" BOOLEAN DEFAULT true,
  "isModerated" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fromUserId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "toTutorId" UUID NOT NULL REFERENCES profile_tutors(id) ON DELETE CASCADE,
  score DECIMAL(3, 2),
  reason VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS "idx_profile_tutors_userId" ON profile_tutors("userId");
CREATE INDEX IF NOT EXISTS idx_profile_tutors_rating ON profile_tutors(rating DESC);
CREATE INDEX IF NOT EXISTS "idx_annonces_tutorId" ON annonces("tutorId");
CREATE INDEX IF NOT EXISTS idx_annonces_subject ON annonces(subject);
CREATE INDEX IF NOT EXISTS "idx_annonces_isActive" ON annonces("isActive");
CREATE INDEX IF NOT EXISTS "idx_reviews_tutorId" ON reviews("tutorId");
CREATE INDEX IF NOT EXISTS "idx_reviews_studentId" ON reviews("studentId");

-- Insert sample user for testing
INSERT INTO users (email, password, "firstName", "lastName", role, "isVerified") 
VALUES (
  'demo@edumate.local',
  '$2a$12$Dx.VKo6fxXqGfkYl0Yr8DOnlcVZJd8f5l5dXV.Bl9VVVbpNqq51Ya', -- password: 'demo123'
  'Demo',
  'User',
  'admin',
  true
) ON CONFLICT (email) DO NOTHING;

-- Grant permissions to application user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO edumate_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO edumate_user;
GRANT CREATE ON SCHEMA public TO edumate_user;

COMMIT;
