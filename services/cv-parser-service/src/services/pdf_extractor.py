import PyPDF2
import pdfplumber
import logging
from typing import Optional
import io

logger = logging.getLogger(__name__)

class PDFExtractor:
    """Extracteur de texte depuis les fichiers PDF"""
    
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> Optional[str]:
        """
        Extraire le texte d'un fichier PDF - ancienne méthode pour compatibilité
        """
        try:
            with open(file_path, 'rb') as f:
                pdf_bytes = f.read()
            return PDFExtractor.extract_text_from_pdf_bytes(pdf_bytes)
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'extraction PDF: {e}")
            raise ValueError(f"Impossible d'extraire le texte du PDF: {e}")
    
    @staticmethod
    def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> Optional[str]:
        """
        Extraire le texte depuis des bytes PDF (100% en mémoire)
        Optimisé: essayer pdfplumber d'abord (plus rapide et précis)
        """
        try:
            # Utiliser pdfplumber d'abord (plus précis et rapide)
            try:
                text = ""
                with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n\n"
                
                if text.strip():
                    logger.info(f"✅ PDF extrait avec pdfplumber ({len(text)} caractères)")
                    return text.strip()
            except Exception as e:
                logger.debug(f"pdfplumber échoué: {e}, essai avec PyPDF2")
            
            # Fallback avec PyPDF2 si pdfplumber échoue
            text = ""
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
            
            if text.strip():
                logger.info(f"✅ PDF extrait avec PyPDF2 ({len(text)} caractères)")
                return text.strip()
            
            logger.warning("⚠️ Aucun texte extrait du PDF")
            return ""
            
        except Exception as e:
            logger.error(f"Erreur extraction PDF bytes: {e}")
            raise ValueError(f"Impossible d'extraire le texte du PDF: {e}")
    
    @staticmethod
    def get_pdf_metadata(file_path: str) -> dict:
        """
        Récupérer les métadonnées d'un PDF
        """
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                metadata = pdf_reader.metadata
                
                return {
                    'title': metadata.get('/Title', ''),
                    'author': metadata.get('/Author', ''),
                    'subject': metadata.get('/Subject', ''),
                    'creator': metadata.get('/Creator', ''),
                    'producer': metadata.get('/Producer', ''),
                    'creation_date': metadata.get('/CreationDate', ''),
                    'modification_date': metadata.get('/ModDate', ''),
                    'num_pages': len(pdf_reader.pages)
                }
        except Exception as e:
            logger.error(f"Erreur métadonnées PDF: {e}")
            return {}