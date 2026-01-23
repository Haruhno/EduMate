import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from functools import lru_cache
import re
from openai import OpenAI
import os
from config import Config

from models.cv_model import CVData, PersonalInfo, Education, Experience, SkillCategory

logger = logging.getLogger(__name__)

class MistralCVService:
    """Service d'analyse de CV avec Mistral"""
    
    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or Config.MISTRAL_API_KEY
        self.model = model or Config.MISTRAL_MODEL
        
    def analyze_cv_text(self, cv_text: str, language: str = "fr") -> CVData:
        """
        Analyser le texte d'un CV avec Mistral
        """
        try:
            # Prompt optimisé pour l'extraction de CV
            system_prompt = self._get_system_prompt(language)
            user_prompt = self._get_user_prompt(cv_text, language)
            
            logger.info(f"Envoi de l'analyse CV à Mistral (modèle: {self.model})")
            
            # Appel à Mistral via OpenRouter
            response = self._call_mistral_api(system_prompt, user_prompt)
            
            # Extraire et parser la réponse JSON
            content = response.get("content", "")
            logger.debug(f"Réponse Mistral brute: {content[:500]}...")
            
            # Nettoyer et parser le JSON
            json_content = self._clean_json_response(content)
            parsed_data = json.loads(json_content)
            
            # Convertir en objets CVData
            cv_data = self._json_to_cvdata(parsed_data)
            
            # Évaluer la qualité de l'extraction
            quality_score = self._evaluate_extraction_quality(cv_data, cv_text)
            cv_data.validation.update(quality_score)
            
            logger.info(f"✅ Analyse réussie - Qualité: {quality_score['quality']} ({quality_score['confidence']:.2f})")
            return cv_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Erreur de parsing JSON: {e}")
            logger.error(f"Contenu problématique: {content[:1000]}")
            raise ValueError(f"Erreur lors de l'analyse du CV: réponse JSON invalide")
            
        except Exception as e:
            logger.error(f"Erreur lors de l'analyse Mistral: {e}")
            raise
    
    def _call_mistral_api(self, system_prompt: str, user_prompt: str) -> Dict:
        """
        Appeler l'API Mistral via OpenRouter pour analyser le CV
        """
        try:
            client = OpenAI(
                api_key=self.api_key,
                base_url="https://openrouter.ai/api/v1"
            )

            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=Config.MISTRAL_TEMPERATURE,
                max_tokens=Config.MISTRAL_MAX_TOKENS
            )
            
            content = response.choices[0].message.content
            return {"content": content}
            
        except Exception as e:
            logger.error(f"Erreur appel OpenAI: {e}")
            # Fallback to empty response
            return {
                "content": '{"personal": {"firstName": "", "lastName": ""}, "education": [], "experience": [], "skills": {"technical": []}, "summary": ""}'
            }
    
    def _get_system_prompt(self, language: str) -> str:
        """Générer le prompt système selon la langue"""
        if language == "en":
            return """You are an expert CV/Resume parser specialized in extracting structured information from CVs.
            Extract all relevant information and return it as a structured JSON object.
            Be accurate, thorough, and pay attention to details.
            Handle multiple languages and formats appropriately."""
        
        # Prompt français (par défaut)
        return """Tu es un analyseur expert de CV spécialisé dans l'extraction d'informations structurées à partir de CV.
        Extrais toutes les informations pertinentes et retourne-les sous forme d'objet JSON structuré.
        Sois précis, minutieux et fais attention aux détails.
        Gère correctement plusieurs langues et formats.
        
        IMPORTANT: Retourne UNIQUEMENT le JSON valide, sans texte supplémentaire, sans commentaires, sans markdown."""
    
    def _get_user_prompt(self, cv_text: str, language: str) -> str:
        """Générer le prompt utilisateur"""
        if language == "en":
            return f"""Analyze the following CV/resume text and extract all relevant information into the specified JSON structure:

            {cv_text}

            Return the data in this exact JSON structure:
            {{
                "personal": {{
                    "firstName": "",
                    "lastName": "",
                    "email": [],
                    "phone": [],
                    "address": "",
                    "birthDate": "",
                    "gender": "",
                    "nationality": "",
                    "linkedin": "",
                    "github": ""
                }},
                "education": [
                    {{
                        "educationLevel": "",
                        "diplomaName": "",
                        "field": "",
                        "school": "",
                        "country": "",
                        "city": "",
                        "startYear": null,
                        "endYear": null,
                        "isCurrent": false,
                        "description": "",
                        "gpa": null
                    }}
                ],
                "experience": [
                    {{
                        "jobTitle": "",
                        "employmentType": "",
                        "company": "",
                        "location": "",
                        "startMonth": "",
                        "startYear": null,
                        "endMonth": "",
                        "endYear": null,
                        "isCurrent": false,
                        "description": "",
                        "achievements": [],
                        "technologies": []
                    }}
                ],
                "skills": {{
                    "technical": [],
                    "languages": [],
                    "soft": [],
                    "tools": [],
                    "frameworks": []
                }},
                "summary": "",
                "certifications": [],
                "projects": [],
                "languages": [],
                "validation": {{
                    "quality": "",
                    "confidence": 0.0,
                    "extractionDate": ""
                }}
            }}

            Guidelines:
            1. Extract ALL emails and phone numbers you find
            2. Parse dates intelligently (dd/mm/yyyy, mm/yyyy, yyyy, etc.)
            3. Normalize skill names (e.g., "Python" not "python", "React.js" not "react")
            4. If information is missing, leave the field empty or null
            5. Handle French and English content appropriately
            6. For employmentType: use "CDI", "CDD", "Stage", "Alternance", "Freelance", "Intérim", "Other"
            7. For educationLevel: use "Brevet des collèges", "Baccalauréat", "Bac+2", "BUT", "Licence", "Master", "Doctorat", "Autre"
            
            REMEMBER: Return ONLY valid JSON."""
        
        # Prompt français
        return f"""Analyse le texte de CV suivant et extrais toutes les informations pertinentes dans la structure JSON spécifiée:

        {cv_text}

        Retourne les données dans cette structure JSON exacte:
        {{
            "personal": {{
                "firstName": "",
                "lastName": "",
                "email": [],
                "phone": [],
                "address": "",
                "birthDate": "",
                "gender": "",
                "nationality": "",
                "linkedin": "",
                "github": ""
            }},
            "education": [
                {{
                    "educationLevel": "",
                    "diplomaName": "",
                    "field": "",
                    "school": "",
                    "country": "",
                    "city": "",
                    "startYear": null,
                    "endYear": null,
                    "isCurrent": false,
                    "description": "",
                    "gpa": null
                }}
            ],
            "experience": [
                {{
                    "jobTitle": "",
                    "employmentType": "",
                    "company": "",
                    "location": "",
                    "startMonth": "",
                    "startYear": null,
                    "endMonth": "",
                    "endYear": null,
                    "isCurrent": false,
                    "description": "",
                    "achievements": [],
                    "technologies": []
                }}
            ],
            "skills": {{
                "technical": [],
                "languages": [],
                "soft": [],
                "tools": [],
                "frameworks": []
            }},
            "summary": "",
            "certifications": [],
            "projects": [],
            "languages": [],
            "validation": {{
                "quality": "",
                "confidence": 0.0,
                "extractionDate": ""
            }}
        }}

        Consignes:
        1. Extrais TOUS les emails et numéros de téléphone que tu trouves
        2. Analyse les dates intelligemment (jj/mm/aaaa, mm/aaaa, aaaa, etc.)
        3. Normalise les noms de compétences (ex: "Python" pas "python", "React.js" pas "react")
        4. Si l'information est manquante, laisse le champ vide ou null
        5. Gère correctement le contenu français et anglais
        6. Pour employmentType: utilise "CDI", "CDD", "Stage", "Alternance", "Freelance", "Intérim", "Autre"
        7. Pour educationLevel: utilise "Brevet des collèges", "Baccalauréat", "Bac+2", "BUT", "Licence", "Master", "Doctorat", "Autre"
        
        IMPORTANT: Retourne UNIQUEMENT du JSON valide, sans texte supplémentaire."""
    
    def _clean_json_response(self, content: str) -> str:
        """Nettoyer la réponse JSON de Mistral"""
        # Supprimer les marqueurs de code
        content = re.sub(r'```json\n?', '', content)
        content = re.sub(r'\n?```', '', content)
        
        # Supprimer les espaces en début/fin
        content = content.strip()
        
        # Vérifier si c'est du JSON valide
        try:
            json.loads(content)
            return content
        except json.JSONDecodeError:
            # Essayer d'extraire le JSON avec regex
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                return json_match.group(0)
            raise
    
    def _json_to_cvdata(self, data: Dict[str, Any]) -> CVData:
        """Convertir le JSON en objets CVData"""
        # Personal Info
        personal_data = data.get('personal', {})
        personal = PersonalInfo(
            firstName=personal_data.get('firstName', ''),
            lastName=personal_data.get('lastName', ''),
            email=personal_data.get('email', []),
            phone=personal_data.get('phone', []),
            address=personal_data.get('address', ''),
            birthDate=personal_data.get('birthDate'),
            gender=personal_data.get('gender', ''),
            nationality=personal_data.get('nationality', ''),
            linkedin=personal_data.get('linkedin', ''),
            github=personal_data.get('github', '')
        )
        
        # Education
        education_list = []
        for edu_data in data.get('education', []):
            education = Education(
                educationLevel=edu_data.get('educationLevel', ''),
                diplomaName=edu_data.get('diplomaName', ''),
                field=edu_data.get('field', ''),
                school=edu_data.get('school', ''),
                country=edu_data.get('country', ''),
                city=edu_data.get('city', ''),
                startYear=edu_data.get('startYear'),
                endYear=edu_data.get('endYear'),
                isCurrent=edu_data.get('isCurrent', False),
                description=edu_data.get('description', ''),
                gpa=edu_data.get('gpa')
            )
            education_list.append(education)
        
        # Experience
        experience_list = []
        for exp_data in data.get('experience', []):
            experience = Experience(
                jobTitle=exp_data.get('jobTitle', ''),
                employmentType=exp_data.get('employmentType', ''),
                company=exp_data.get('company', ''),
                location=exp_data.get('location', ''),
                startMonth=exp_data.get('startMonth', ''),
                startYear=exp_data.get('startYear'),
                endMonth=exp_data.get('endMonth', ''),
                endYear=exp_data.get('endYear'),
                isCurrent=exp_data.get('isCurrent', False),
                description=exp_data.get('description', ''),
                achievements=exp_data.get('achievements', []),
                technologies=exp_data.get('technologies', [])
            )
            experience_list.append(experience)
        
        # Skills
        skills_data = data.get('skills', {})
        skills = SkillCategory(
            technical=skills_data.get('technical', []),
            languages=skills_data.get('languages', []),
            soft=skills_data.get('soft', []),
            tools=skills_data.get('tools', []),
            frameworks=skills_data.get('frameworks', [])
        )
        
        # Projects
        projects = data.get('projects', [])
        
        # Languages
        languages = data.get('languages', [])
        
        # Certifications
        certifications = data.get('certifications', [])
        
        # Summary
        summary = data.get('summary', '')
        
        # Validation
        validation = data.get('validation', {})
        
        return CVData(
            personal=personal,
            education=education_list,
            experience=experience_list,
            skills=skills,
            summary=summary,
            certifications=certifications,
            projects=projects,
            languages=languages,
            validation=validation
        )
    
    def _evaluate_extraction_quality(self, cv_data: CVData, original_text: str) -> Dict[str, Any]:
        """Évaluer la qualité de l'extraction"""
        score = 0
        max_score = 100
        
        # Critères de qualité
        if cv_data.personal.firstName and cv_data.personal.lastName:
            score += 20
        
        if cv_data.personal.email:
            score += 15
        
        if cv_data.personal.phone:
            score += 10
        
        if cv_data.education:
            score += 20
        
        if cv_data.experience:
            score += 20
        
        if cv_data.skills.technical:
            score += 15
        
        # Normaliser le score
        confidence = score / max_score
        
        # Déterminer la qualité
        if confidence >= 0.8:
            quality = "EXCELLENT"
        elif confidence >= 0.6:
            quality = "GOOD"
        elif confidence >= 0.4:
            quality = "FAIR"
        else:
            quality = "BASIC"
        
        return {
            "quality": quality,
            "confidence": confidence,
            "score": score,
            "maxScore": max_score,
            "extractionDate": datetime.now().isoformat()
        }