from typing import Dict, Any, Optional
from datetime import datetime
from functools import lru_cache
import json
import logging
import re
from openai import OpenAI

from src.config import Config
from src.models.cv_model import CVData, PersonalInfo, Education, Experience, SkillCategory

logger = logging.getLogger(__name__)


class MistralCVService:
    """Service d'analyse de CV avec Mistral via OpenRouter"""
    
    # JSON de fallback complet
    DEFAULT_CV_JSON = {
        "personal": {
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
        },
        "education": [],
        "experience": [],
        "skills": {
            "technical": [],
            "languages": [],
            "soft": [],
            "tools": [],
            "frameworks": []
        },
        "summary": "",
        "certifications": [],
        "projects": [],
        "languages": [],
        "validation": {
            "quality": "EMPTY",
            "confidence": 0.0,
            "extractionDate": datetime.now().isoformat(),
            "note": "Réponse vide ou non traitable de Mistral"
        }
    }
    
    def __init__(self, api_key: str = None, model: str = None):
        """Initialiser le service Mistral"""
        self.api_key = api_key or Config.MISTRAL_API_KEY
        self.model = model or Config.MISTRAL_MODEL
        logger.info(f"✅ MistralCVService initialisé avec modèle: {self.model}")
    
    def analyze_cv_text(self, cv_text: str, language: str = "fr") -> CVData:
        """
        Analyser le texte d'un CV avec Mistral.
        Méthode robuste qui ne lève jamais d'exception.
        
        Args:
            cv_text: Texte brut du CV
            language: 'fr' ou 'en'
            
        Returns:
            CVData avec données extraites ou valeurs par défaut
        """
        try:
            logger.info(f"🔍 Début analyse CV ({len(cv_text)} caractères, langue: {language})")
            
            # Nettoyer le texte UTF-8
            cv_text = self._clean_utf8_text(cv_text)
            
            if not cv_text or len(cv_text.strip()) < 10:
                logger.warning("⚠️ Texte CV vide après nettoyage")
                return self._json_to_cvdata(self.DEFAULT_CV_JSON)
            
            # Générer les prompts
            system_prompt = self._get_system_prompt(language)
            user_prompt = self._get_user_prompt(cv_text, language)
            
            logger.info("🤖 Envoi à Mistral pour analyse...")
            
            # Appeler Mistral
            response = self._call_mistral_api(system_prompt, user_prompt)
            content = response.get("content", "").strip()
            
            if not content:
                logger.warning("⚠️ Mistral a retourné une réponse vide")
                return self._json_to_cvdata(self.DEFAULT_CV_JSON)
            
            logger.debug(f"📤 Réponse brute Mistral ({len(content)} caractères): {content[:300]}...")
            
            # Nettoyer et parser le JSON
            json_content = self._clean_json_response(content)
            parsed_data = json.loads(json_content)
            
            logger.info("✅ JSON parsé avec succès")
            
            # Convertir en CVData
            cv_data = self._json_to_cvdata(parsed_data)
            
            # Évaluer la qualité
            quality_score = self._evaluate_extraction_quality(cv_data, cv_text)
            cv_data.validation.update(quality_score)
            
            logger.info(f"✅ Analyse réussie - Qualité: {quality_score['quality']} ({quality_score['confidence']:.2%})")
            return cv_data
            
        except json.JSONDecodeError as e:
            logger.warning(f"⚠️ Erreur parsing JSON: {e}")
            logger.info("🔄 Utilisation du JSON de fallback")
            return self._json_to_cvdata(self.DEFAULT_CV_JSON)
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'analyse Mistral: {type(e).__name__}: {e}")
            logger.info("🔄 Utilisation du JSON de fallback")
            return self._json_to_cvdata(self.DEFAULT_CV_JSON)
    
    def _clean_utf8_text(self, text: str) -> str:
        """Nettoyer le texte pour enlever les caractères invalides UTF-8"""
        try:
            # Encoder/décoder pour nettoyer
            if isinstance(text, bytes):
                text = text.decode('utf-8', errors='ignore')
            else:
                text = text.encode('utf-8', errors='ignore').decode('utf-8')
            
            # Supprimer les caractères de contrôle (sauf \n, \r, \t)
            text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\r\t')
            
            # Normaliser les espaces multiples
            text = re.sub(r'\s+', ' ', text)
            
            return text.strip()
        except Exception as e:
            logger.warning(f"Erreur nettoyage UTF-8: {e}")
            return text
    
    def _call_mistral_api(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Appeler l'API Mistral via OpenRouter"""
        errors = []
        models_to_try = [m for m in [self.model, Config.MISTRAL_FALLBACK_MODEL] if m]
        
        for model in models_to_try:
            try:
                client = OpenAI(
                    api_key=self.api_key,
                    base_url="https://openrouter.ai/api/v1",
                    timeout=Config.MISTRAL_TIMEOUT
                )
                
                logger.debug(f"📡 Appel API Mistral ({model})...")
                
                # Certains modèles Google Gemma rejettent les messages système.
                if model.startswith("google/gemma"):
                    merged_prompt = f"{system_prompt}\n\n{user_prompt}"
                    messages = [{"role": "user", "content": merged_prompt}]
                else:
                    messages = [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                
                message = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=Config.MISTRAL_TEMPERATURE,
                    max_tokens=Config.MISTRAL_MAX_TOKENS,
                )
                
                content = message.choices[0].message.content or ""
                logger.debug(f"✅ Réponse API reçue ({len(content)} caractères) depuis {model}")
                
                # Si on a utilisé le modèle de fallback, mémoriser pour les prochains appels
                self.model = model
                
                return {
                    "content": content,
                    "model": message.model,
                    "usage": {
                        "prompt_tokens": message.usage.prompt_tokens,
                        "completion_tokens": message.usage.completion_tokens
                    }
                }
                
            except Exception as e:
                logger.error(f"❌ Erreur appel API Mistral ({model}): {type(e).__name__}: {e}")
                errors.append(f"{model}: {type(e).__name__}: {e}")
                continue
        
        # Si tous les modèles échouent, re-raise avec le détail
        raise Exception("Tous les modèles Mistral ont échoué: " + " | ".join(errors))
    
    def _get_system_prompt(self, language: str) -> str:
        """Générer le prompt système selon la langue"""
        if language == "en":
            return """You are an expert CV analyzer specialized in extracting structured information from CVs.
Extract all relevant information and return it as a structured JSON object.
Be precise, thorough and pay attention to details.
Handle multiple languages and formats correctly.

IMPORTANT: Return ONLY valid JSON, without additional text, without comments, without markdown."""
        
        return """Tu es un analyseur expert de CV spécialisé dans l'extraction d'informations structurées à partir de CV.
Extrais toutes les informations pertinentes et retourne-les sous forme d'objet JSON structuré.
Sois précis, minutieux et fais attention aux détails.
Gère correctement plusieurs langues et formats.

IMPORTANT: Retourne UNIQUEMENT le JSON valide, sans texte supplémentaire, sans commentaires, sans markdown."""
    
    def _get_user_prompt(self, cv_text: str, language: str) -> str:
        """Générer un prompt utilisateur plus détaillé"""
        # Limiter la taille du texte CV
        if len(cv_text) > 4000:
            cv_text = cv_text[:4000] + "... [tronqué]"
        
        if language == "en":
            return f"""Analyze this CV and extract ALL information:

    {cv_text}

    Return ONLY valid JSON in this exact structure:
    {{
        "personal": {{
            "firstName": "",
            "lastName": "",
            "email": [],
            "phone": [],
            "address": "",
            "birthDate": "",
            "gender": ""
        }},
        "education": [
            {{
                "educationLevel": "",
                "field": "",
                "school": "",
                "startYear": null,
                "endYear": null,
                "isCurrent": false
            }}
        ],
        "experience": [
            {{
                "jobTitle": "",
                "company": "",
                "startYear": null,
                "endYear": null,
                "isCurrent": false,
                "description": ""
            }}
        ],
        "skills": {{
            "technical": []
        }},
        "summary": "",
        "languages": []
    }}

    CRITICAL: You MUST include ALL sections: personal, education, experience, skills, summary, languages.
    If a section has no data, return empty array [] or empty object {{}}.
    Do NOT skip any section."""

        return f"""Analyse ce CV et extrais TOUTES les informations:

    {cv_text}

    Retourne UNIQUEMENT du JSON valide dans cette structure exacte:
    {{
        "personal": {{
            "firstName": "",
            "lastName": "",
            "email": [],
            "phone": [],
            "address": "",
            "birthDate": "",
            "gender": ""
        }},
        "education": [
            {{
                "educationLevel": "",
                "field": "",
                "school": "",
                "startYear": null,
                "endYear": null,
                "isCurrent": false
            }}
        ],
        "experience": [
            {{
                "jobTitle": "",
                "company": "",
                "startYear": null,
                "endYear": null,
                "isCurrent": false,
                "description": ""
            }}
        ],
        "skills": {{
            "technical": []
        }},
        "summary": "",
        "languages": []
    }}

    CRITIQUE: Tu DOIS inclure TOUTES les sections: personal, education, experience, skills, summary, languages.
    Si une section n'a pas de données, retourne un tableau vide [] ou un objet vide {{}}.
    Ne SAUTE AUCUNE section."""
    
    def _clean_json_response(self, content: str) -> str:
        """
        Nettoyer la réponse JSON de Mistral.
        Tente toujours de retourner du JSON valide.
        """
        try:
            # Supprimer les marqueurs de code markdown
            content = re.sub(r'```json\s*', '', content)
            content = re.sub(r'```\s*', '', content)
            
            # Supprimer les espaces en début/fin
            content = content.strip()
            
            # Vérifier si c'est du JSON valide
            try:
                json.loads(content)
                logger.debug("✅ JSON valide sans nettoyage")
                return content
            except json.JSONDecodeError:
                pass
            
            # Essayer d'extraire le JSON du texte
            logger.warning("⚠️ JSON invalide, tentative d'extraction...")
            
            # Chercher le premier { et le dernier }
            start_idx = content.find('{')
            end_idx = content.rfind('}')
            
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                json_str = content[start_idx:end_idx + 1]
                
                try:
                    json.loads(json_str)
                    logger.debug("✅ JSON extrait valide")
                    return json_str
                except json.JSONDecodeError:
                    pass
            
            # Essayer de fixer les JSON cassés courants
            logger.warning("⚠️ Tentative de réparation du JSON...")
            content = self._repair_json(content)
            
            # Vérifier une dernière fois
            try:
                json.loads(content)
                logger.debug("✅ JSON réparé valide")
                return content
            except json.JSONDecodeError:
                pass
            
            # Fallback: retourner le JSON par défaut
            logger.warning("⚠️ Impossible de parser le JSON, utilisation du fallback")
            return json.dumps(self.DEFAULT_CV_JSON)
            
        except Exception as e:
            logger.error(f"❌ Erreur nettoyage JSON: {e}")
            return json.dumps(self.DEFAULT_CV_JSON)
    
    def _repair_json(self, content: str) -> str:
        """Réparer les JSON cassés courants"""
        # Remplacer les guillemets simples par des guillemets doubles
        # (attention à ne pas remplacer dans les valeurs)
        content = content.replace("'", '"')
        
        # Ajouter les guillemets manquants autour des clés
        content = re.sub(r'(\{|,)\s*([a-zA-Z_]\w*)\s*:', r'\1 "\2":', content)
        
        # Supprimer les virgules finales dans les objets/listes
        content = re.sub(r',(\s*[}\]])', r'\1', content)
        
        return content
    
    def _json_to_cvdata(self, data: Optional[Dict[str, Any]]) -> CVData:
        """
        Convertir le JSON en objets CVData.
        Robuste : ne lève jamais d'exception.
        """
        try:
            if not data or not isinstance(data, dict):
                logger.warning("⚠️ Données JSON invalides, utilisation des défauts")
                data = self.DEFAULT_CV_JSON
            
            # Personal Info
            personal_data = data.get('personal', {}) or {}
            personal = PersonalInfo(
                firstName=str(personal_data.get('firstName', '')).strip(),
                lastName=str(personal_data.get('lastName', '')).strip(),
                email=self._to_list(personal_data.get('email', [])),
                phone=self._to_list(personal_data.get('phone', [])),
                address=str(personal_data.get('address', '')).strip(),
                birthDate=personal_data.get('birthDate'),
                gender=str(personal_data.get('gender', '')).strip(),
                nationality=str(personal_data.get('nationality', '')).strip(),
                linkedin=str(personal_data.get('linkedin', '')).strip(),
                github=str(personal_data.get('github', '')).strip()
            )
            
            # Education
            education_list = []
            for edu_data in data.get('education', []) or []:
                try:
                    if not isinstance(edu_data, dict):
                        continue
                    education = Education(
                        educationLevel=str(edu_data.get('educationLevel', '')).strip(),
                        diplomaName=str(edu_data.get('diplomaName', '')).strip(),
                        field=str(edu_data.get('field', '')).strip(),
                        school=str(edu_data.get('school', '')).strip(),
                        country=str(edu_data.get('country', '')).strip(),
                        city=str(edu_data.get('city', '')).strip(),
                        startYear=self._to_int(edu_data.get('startYear')),
                        endYear=self._to_int(edu_data.get('endYear')),
                        isCurrent=bool(edu_data.get('isCurrent', False)),
                        description=str(edu_data.get('description', '')).strip(),
                        gpa=edu_data.get('gpa')
                    )
                    education_list.append(education)
                except Exception as e:
                    logger.warning(f"⚠️ Erreur parsing éducation: {e}")
                    continue
            
            # Experience
            experience_list = []
            for exp_data in data.get('experience', []) or []:
                try:
                    if not isinstance(exp_data, dict):
                        continue
                    experience = Experience(
                        jobTitle=str(exp_data.get('jobTitle', '')).strip(),
                        employmentType=str(exp_data.get('employmentType', '')).strip(),
                        company=str(exp_data.get('company', '')).strip(),
                        location=str(exp_data.get('location', '')).strip(),
                        startMonth=str(exp_data.get('startMonth', '')).strip(),
                        startYear=self._to_int(exp_data.get('startYear')),
                        endMonth=str(exp_data.get('endMonth', '')).strip(),
                        endYear=self._to_int(exp_data.get('endYear')),
                        isCurrent=bool(exp_data.get('isCurrent', False)),
                        description=str(exp_data.get('description', '')).strip(),
                        achievements=self._to_list(exp_data.get('achievements', [])),
                        technologies=self._to_list(exp_data.get('technologies', []))
                    )
                    experience_list.append(experience)
                except Exception as e:
                    logger.warning(f"⚠️ Erreur parsing expérience: {e}")
                    continue
            
            # Skills
            skills_data = data.get('skills', {}) or {}
            skills = SkillCategory(
                technical=self._to_list(skills_data.get('technical', [])),
                languages=self._to_list(skills_data.get('languages', [])),
                soft=self._to_list(skills_data.get('soft', [])),
                tools=self._to_list(skills_data.get('tools', [])),
                frameworks=self._to_list(skills_data.get('frameworks', []))
            )
            
            # Other fields
            projects = self._to_list(data.get('projects', []))
            languages = self._to_list(data.get('languages', []))
            certifications = self._to_list(data.get('certifications', []))
            summary = str(data.get('summary', '')).strip()
            
            # Validation
            validation = data.get('validation', {}) or {}
            if not isinstance(validation, dict):
                validation = {}
            
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
            
        except Exception as e:
            logger.error(f"❌ Erreur conversion JSON->CVData: {e}")
            # Retourner un CVData vide mais valide
            return CVData(
                personal=PersonalInfo(),
                education=[],
                experience=[],
                skills=SkillCategory(),
                summary="",
                certifications=[],
                projects=[],
                languages=[],
                validation={"quality": "ERROR", "confidence": 0.0}
            )
    
    def _to_list(self, value: Any) -> list:
        """Convertir une valeur en liste"""
        if isinstance(value, list):
            return [str(v).strip() for v in value if v]
        if isinstance(value, str):
            return [value.strip()] if value.strip() else []
        return []
    
    def _to_int(self, value: Any) -> Optional[int]:
        """Convertir une valeur en entier"""
        try:
            if value is None:
                return None
            return int(value)
        except (ValueError, TypeError):
            return None
    
    def _evaluate_extraction_quality(self, cv_data: CVData, original_text: str) -> Dict[str, Any]:
        """
        Évaluer la qualité de l'extraction.
        Calcule un score basé sur les champs remplis.
        """
        try:
            score = 0
            max_score = 100
            
            # Informations personnelles (20 points)
            if cv_data.personal.firstName and cv_data.personal.lastName:
                score += 15
            if cv_data.personal.email:
                score += 5
            
            # Contact (15 points)
            if cv_data.personal.phone:
                score += 8
            if cv_data.personal.address:
                score += 7
            
            # Éducation (20 points)
            if cv_data.education:
                score += min(20, len(cv_data.education) * 5)
            
            # Expérience (20 points)
            if cv_data.experience:
                score += min(20, len(cv_data.experience) * 5)
            
            # Compétences (15 points)
            if cv_data.skills.technical:
                score += 8
            if cv_data.skills.soft or cv_data.skills.languages:
                score += 7
            
            # Résumé (10 points)
            if cv_data.summary and len(cv_data.summary.strip()) > 10:
                score += 10
            
            # Normaliser
            confidence = min(1.0, score / max_score)
            
            # Déterminer la qualité
            if confidence >= 0.85:
                quality = "EXCELLENT"
            elif confidence >= 0.70:
                quality = "GOOD"
            elif confidence >= 0.50:
                quality = "FAIR"
            elif confidence >= 0.30:
                quality = "BASIC"
            else:
                quality = "POOR"
            
            return {
                "quality": quality,
                "confidence": confidence,
                "score": score,
                "maxScore": max_score,
                "extractionDate": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Erreur évaluation qualité: {e}")
            return {
                "quality": "UNKNOWN",
                "confidence": 0.0,
                "score": 0,
                "maxScore": 100,
                "extractionDate": datetime.now().isoformat()
            }