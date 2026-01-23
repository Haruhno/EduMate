# src/models/cv_model.py

from dataclasses import dataclass, asdict, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

@dataclass
class PersonalInfo:
    """Informations personnelles extraites du CV"""
    firstName: str = ""
    lastName: str = ""
    email: List[str] = field(default_factory=list)
    phone: List[str] = field(default_factory=list)
    address: str = ""
    birthDate: Optional[str] = None
    gender: str = ""
    nationality: str = ""
    linkedin: str = ""
    github: str = ""
    
    def to_dict(self):
        return asdict(self)

@dataclass
class Education:
    """Formation académique"""
    educationLevel: str = ""
    diplomaName: str = ""
    field: str = ""
    school: str = ""
    country: str = ""
    city: str = ""
    startYear: Optional[int] = None
    endYear: Optional[int] = None
    isCurrent: bool = False
    description: str = ""
    gpa: Optional[float] = None
    
    def to_dict(self):
        return asdict(self)

@dataclass
class Experience:
    """Expérience professionnelle"""
    jobTitle: str = ""
    employmentType: str = ""  # CDI, CDD, Stage, etc.
    company: str = ""
    location: str = ""
    startMonth: str = ""
    startYear: Optional[int] = None
    endMonth: str = ""
    endYear: Optional[int] = None
    isCurrent: bool = False
    description: str = ""
    achievements: List[str] = field(default_factory=list)
    technologies: List[str] = field(default_factory=list)
    
    def to_dict(self):
        return asdict(self)

@dataclass
class SkillCategory:
    """Catégorie de compétences"""
    technical: List[str] = field(default_factory=list)
    languages: List[str] = field(default_factory=list)
    soft: List[str] = field(default_factory=list)
    tools: List[str] = field(default_factory=list)
    frameworks: List[str] = field(default_factory=list)
    
    def to_dict(self):
        return asdict(self)

@dataclass
class CVData:
    """Données complètes extraites du CV"""
    personal: PersonalInfo = field(default_factory=PersonalInfo)
    education: List[Education] = field(default_factory=list)
    experience: List[Experience] = field(default_factory=list)
    skills: SkillCategory = field(default_factory=SkillCategory)
    summary: str = ""
    certifications: List[str] = field(default_factory=list)
    projects: List[Dict[str, Any]] = field(default_factory=list)
    languages: List[Dict[str, str]] = field(default_factory=list)
    validation: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        # Initialiser la validation
        if not self.validation:
            self.validation = {
                'quality': 'UNKNOWN',
                'confidence': 0.0,
                'extractionDate': datetime.now().isoformat()
            }
    
    def to_json(self):
        """Convertir en JSON"""
        def serialize(obj):
            if isinstance(obj, (PersonalInfo, Education, Experience, SkillCategory)):
                return obj.to_dict()
            elif isinstance(obj, list):
                return [serialize(item) for item in obj]
            elif isinstance(obj, dict):
                return {key: serialize(value) for key, value in obj.items()}
            else:
                return obj
        
        data = asdict(self)
        return json.dumps(data, default=str, indent=2, ensure_ascii=False)
    
    def to_dict(self):
        """Convertir en dictionnaire Python"""
        def convert(obj):
            if isinstance(obj, (PersonalInfo, Education, Experience, SkillCategory)):
                return obj.to_dict()
            elif isinstance(obj, list):
                return [convert(item) for item in obj]
            elif isinstance(obj, dict):
                return {key: convert(value) for key, value in obj.items()}
            else:
                return obj
        
        return convert(asdict(self))
    
    def get_profile_compatible_data(self) -> Dict[str, Any]:
        """Adapter les données pour le format profileData du frontend"""
        return {
            'firstName': self.personal.firstName,
            'lastName': self.personal.lastName,
            'email': self.personal.email[0] if self.personal.email else '',
            'phone': self.personal.phone[0] if self.personal.phone else '',
            'address': self.personal.address,
            'birthDate': self.personal.birthDate,
            'gender': self.personal.gender,
            'skills': self.skills.technical + self.skills.frameworks + self.skills.tools,
            'experiences': [
                {
                    'title': exp.jobTitle,
                    'company': exp.company,
                    'date': f"{exp.startYear}-{exp.startMonth or '01'} - {exp.endYear}-{exp.endMonth or '01'}" if not exp.isCurrent else f"{exp.startYear}-{exp.startMonth or '01'} - En cours",
                    'description': exp.description
                }
                for exp in self.experience
            ],
            'diplomas': [
                {
                    'educationLevel': edu.educationLevel,
                    'field': edu.field,
                    'school': edu.school,
                    'country': edu.country,
                    'startYear': edu.startYear,
                    'endYear': edu.endYear,
                    'isCurrent': edu.isCurrent
                }
                for edu in self.education
            ],
            'summary': self.summary
        }