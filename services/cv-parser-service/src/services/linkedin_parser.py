import logging
from datetime import datetime
from typing import Dict, Any

from src.services.mistral_service import MistralCVService
from src.models.cv_model import CVData
from src.services.cv_parser import CVParserService

logger = logging.getLogger(__name__)

class LinkedInParserService:
    """
    Service d'analyse de profil LinkedIn à partir de texte brut
    (copié/collé ou export PDF côté frontend)
    """

    def __init__(self, mistral_api_key: str):
        self.mistral_service = MistralCVService(mistral_api_key)
        self.cv_formatter = CVParserService("")

    def parse_linkedin_text(self, linkedin_text: str, language: str = "fr") -> Dict[str, Any]:
        try:
            logger.info("🔍 Début analyse profil LinkedIn")

            if not linkedin_text or len(linkedin_text.strip()) < 50:
                raise ValueError("Texte LinkedIn trop court")

            logger.info(
                f"📄 Texte LinkedIn reçu ({len(linkedin_text)} caractères):\n"
                f"{linkedin_text[:5000]}{'...' if len(linkedin_text) > 5000 else ''}"
            )

            # Analyse via Mistral (même prompt que CV)
            cv_data: CVData = self.mistral_service.analyze_cv_text(
                linkedin_text,
                language
            )

            # Métadonnées spécifiques LinkedIn
            cv_data.validation.update({
                "source": "LINKEDIN",
                "processingMode": "TEXT_ONLY",
                "extractionDate": datetime.now().isoformat(),
                "textLength": len(linkedin_text)
            })

            logger.info("✅ Profil LinkedIn analysé avec succès")

            # Format compatible frontend
            return self.cv_formatter.format_for_frontend(cv_data)

        except Exception as e:
            logger.error(f"❌ Erreur analyse LinkedIn: {e}")
            raise