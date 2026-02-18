import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import re

from .pdf_extractor import PDFExtractor
from .docx_extractor import DOCXExtractor
from .mistral_service import MistralCVService
from models.cv_model import CVData, PersonalInfo, Education, Experience, SkillCategory
from utils.file_utils import FileUtils

logger = logging.getLogger(__name__)

class CVParserService:
    """Service principal d'analyse de CV"""
    
    def __init__(self, mistral_api_key: str):
        self.mistral_service = MistralCVService(mistral_api_key)
        self.file_utils = FileUtils()
        
    def parse_cv_file(self, file_path: str, language: str = "fr") -> CVData:
        """
        Analyser un fichier CV (PDF, DOCX, TXT) - ancienne méthode pour compatibilité
        """
        try:
            if not os.path.exists(file_path):
                raise ValueError(f"Fichier non trouvé: {file_path}")
            
            with open(file_path, 'rb') as f:
                file_bytes = f.read()
            
            return self.parse_cv_bytes(file_bytes, os.path.basename(file_path), language)
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'analyse du CV: {e}")
            raise
    
    def parse_cv_bytes(self, file_bytes: bytes, filename: str, language: str = "fr") -> CVData:
        """
        Analyser un CV depuis des bytes (100% en mémoire)
        """
        try:
            logger.info(f"🔍 Début de l'analyse du fichier: {filename}")
            
            # Extraire le texte selon le format
            file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
            
            cv_text = ""
            
            if file_ext == 'pdf':
                logger.info("📄 Extraction PDF...")
                cv_text = PDFExtractor.extract_text_from_pdf_bytes(file_bytes)
            elif file_ext in ['docx', 'doc']:
                logger.info("📝 Extraction DOCX...")
                cv_text = DOCXExtractor.extract_text_from_docx_bytes(file_bytes)
            elif file_ext == 'txt':
                logger.info("📝 Extraction TXT...")
                cv_text = file_bytes.decode('utf-8', errors='ignore')
            else:
                # Essayer de détecter le format
                if filename.lower().endswith('.pdf'):
                    cv_text = PDFExtractor.extract_text_from_pdf_bytes(file_bytes)
                elif filename.lower().endswith(('.docx', '.doc')):
                    cv_text = DOCXExtractor.extract_text_from_docx_bytes(file_bytes)
                else:
                    # Essayer comme texte brut
                    cv_text = file_bytes.decode('utf-8', errors='ignore')
            
            # Vérifier que le texte n'est pas vide
            if not cv_text or len(cv_text.strip()) < 50:
                logger.warning(f"⚠️ Texte extrait trop court: {len(cv_text)} caractères")
                # Essayer une extraction locale
                cv_data = self._extract_locally(cv_text)
            else:
                logger.info(f"✅ Texte extrait ({len(cv_text)} caractères)")
                
                try:
                    # Analyser avec Mistral
                    logger.info("🤖 Analyse avec Mistral...")
                    cv_data = self.mistral_service.analyze_cv_text(cv_text, language)
                except Exception as mistral_error:
                    logger.warning(f"❌ Mistral a échoué: {mistral_error}")
                    logger.info("🔄 Fallback à l'extraction locale...")
                    cv_data = self._extract_locally(cv_text)
            
            # Ajouter des métadonnées
            cv_data.validation.update({
                'fileType': file_ext,
                'fileSize': len(file_bytes),
                'processingTime': datetime.now().isoformat(),
                'processingMode': 'MEMORY_ONLY',
                'textLength': len(cv_text)
            })
            
            logger.info(f"✅ Analyse terminée - Qualité: {cv_data.validation.get('quality')}")
            return cv_data
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'analyse du CV en mémoire: {e}")
            raise
    
    def _extract_locally(self, cv_text: str) -> CVData:
        """
        Extraction locale basique (fallback quand Mistral échoue)
        """
        logger.info("🔍 Extraction locale des données CV...")
        
        # Extraire les emails
        email_regex = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_regex, cv_text)
        
        # Extraire les téléphones (formats français)
        phone_regex = r'(\+33|0)[1-9](?:[\s.-]?[0-9]{2}){4}'
        phones = re.findall(phone_regex, cv_text)
        
        # Extraire les compétences communes
        common_skills = [
            'Python', 'JavaScript', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Swift',
            'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'Django', 'Flask',
            'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite',
            'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes',
            'Git', 'GitHub', 'GitLab', 'Jira', 'Confluence',
            'HTML', 'CSS', 'Sass', 'Less', 'TypeScript',
            'Agile', 'Scrum', 'Kanban', 'DevOps'
        ]
        
        found_skills = []
        for skill in common_skills:
            if re.search(r'\b' + re.escape(skill) + r'\b', cv_text, re.IGNORECASE):
                found_skills.append(skill)
        
        # Essayer d'extraire le nom (très basique)
        lines = cv_text.split('\n')
        potential_name = lines[0].strip() if lines else ""
        
        # Créer les données CV
        cv_data = CVData(
            personal=PersonalInfo(
                firstName=self._extract_first_name(potential_name),
                lastName=self._extract_last_name(potential_name),
                email=emails,
                phone=phones,
                address="",
                birthDate=None,
                gender=""
            ),
            education=[],
            experience=[],
            skills=SkillCategory(
                technical=found_skills,
                languages=[],
                soft=[],
                tools=[],
                frameworks=[]
            ),
            summary="Extraction locale - données limitées. Pour une meilleure extraction, configurez Mistral.",
            validation={
                'quality': 'BASIC',
                'confidence': 0.3,
                'extractionDate': datetime.now().isoformat(),
                'note': 'Extraction locale (Mistral non disponible)'
            }
        )
        
        logger.info(f"✅ Extraction locale: {len(emails)} emails, {len(phones)} téléphones, {len(found_skills)} compétences")
        return cv_data
    
    def _extract_first_name(self, text: str) -> str:
        """Extraire le prénom (très basique)"""
        parts = text.split()
        return parts[0] if parts else ""
    
    def _extract_last_name(self, text: str) -> str:
        """Extraire le nom (très basique)"""
        parts = text.split()
        return ' '.join(parts[1:]) if len(parts) > 1 else ""
    
    def parse_multiple_cvs(self, file_paths: list, language: str = "fr") -> Dict[str, CVData]:
        """
        Analyser plusieurs CV en batch
        """
        results = {}
        
        for file_path in file_paths:
            try:
                cv_data = self.parse_cv_file(file_path, language)
                filename = os.path.basename(file_path)
                results[filename] = cv_data
                logger.info(f"✅ CV analysé: {filename}")
            except Exception as e:
                logger.error(f"❌ Échec analyse {file_path}: {e}")
                results[filename] = {'error': str(e)}
        
        return results
    
    def get_extraction_statistics(self, cv_data: CVData) -> Dict[str, Any]:
        """
        Générer des statistiques sur l'extraction
        """
        return {
            'personal_info_completeness': self._calculate_completeness(cv_data.personal),
            'education_count': len(cv_data.education),
            'experience_count': len(cv_data.experience),
            'skills_count': {
                'technical': len(cv_data.skills.technical),
                'tools': len(cv_data.skills.tools),
                'frameworks': len(cv_data.skills.frameworks),
                'languages': len(cv_data.skills.languages),
                'soft': len(cv_data.skills.soft)
            },
            'validation': cv_data.validation
        }
    
    def _calculate_completeness(self, personal_info) -> float:
        """Calculer le taux de complétion des infos personnelles"""
        fields = ['firstName', 'lastName', 'email', 'phone', 'address']
        filled = 0
        
        for field in fields:
            value = getattr(personal_info, field, None)
            if isinstance(value, list):
                if value:
                    filled += 1
            elif value and str(value).strip():
                filled += 1
        
        return filled / len(fields) if fields else 0.0
    
    def format_for_frontend(self, cv_data: CVData) -> Dict[str, Any]:
        """
        Formater les données pour le frontend React
        """
        return {
            'success': True,
            'message': 'CV analysé avec succès',
            'data': cv_data.get_profile_compatible_data(),
            'metadata': {
                'quality': cv_data.validation.get('quality', 'UNKNOWN'),
                'confidence': cv_data.validation.get('confidence', 0.0),
                'extractionDate': cv_data.validation.get('extractionDate'),
                'processingMode': cv_data.validation.get('processingMode', 'MEMORY_ONLY'),
                'statistics': self.get_extraction_statistics(cv_data),
                'filename': cv_data.validation.get('filename'),
                'fileType': cv_data.validation.get('fileType'),
                'textLength': cv_data.validation.get('textLength', 0)
            }
        }