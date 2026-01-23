# src/utils/file_utils.py

import os
import hashlib
import uuid
from typing import Optional, Tuple
from werkzeug.utils import secure_filename
import logging

logger = logging.getLogger(__name__)

class FileUtils:
    """Utilitaires de gestion de fichiers"""
    
    @staticmethod
    def allowed_file(filename: str, allowed_extensions: set) -> bool:
        """
        Vérifier si l'extension du fichier est autorisée
        """
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in allowed_extensions
    
    @staticmethod
    def generate_unique_filename(filename: str) -> str:
        """
        Générer un nom de fichier unique
        """
        # Sécuriser le nom original
        safe_name = secure_filename(filename)
        
        # Ajouter un UUID pour éviter les collisions
        name, ext = os.path.splitext(safe_name)
        unique_id = str(uuid.uuid4())[:8]
        
        return f"{name}_{unique_id}{ext}"
    
    @staticmethod
    def save_uploaded_file(file, upload_folder: str) -> Tuple[str, str]:
        """
        Sauvegarder un fichier uploadé
        """
        try:
            # Vérifier que le dossier existe
            os.makedirs(upload_folder, exist_ok=True)
            
            # Générer un nom de fichier unique
            unique_filename = FileUtils.generate_unique_filename(file.filename)
            file_path = os.path.join(upload_folder, unique_filename)
            
            # Sauvegarder le fichier
            file.save(file_path)
            
            logger.info(f"✅ Fichier sauvegardé: {file_path}")
            return file_path, unique_filename
            
        except Exception as e:
            logger.error(f"❌ Erreur sauvegarde fichier: {e}")
            raise
    
    @staticmethod
    def calculate_file_hash(file_path: str) -> str:
        """
        Calculer le hash d'un fichier pour éviter les doublons
        """
        hash_md5 = hashlib.md5()
        
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        
        return hash_md5.hexdigest()
    
    @staticmethod
    def get_file_info(file_path: str) -> dict:
        """
        Récupérer les informations d'un fichier
        """
        try:
            stat = os.stat(file_path)
            
            return {
                'filename': os.path.basename(file_path),
                'path': file_path,
                'size': stat.st_size,
                'created': stat.st_ctime,
                'modified': stat.st_mtime,
                'extension': os.path.splitext(file_path)[1].lower(),
                'hash': FileUtils.calculate_file_hash(file_path)
            }
        except Exception as e:
            logger.error(f"Erreur info fichier: {e}")
            return {}
    
    @staticmethod
    def cleanup_old_files(upload_folder: str, max_age_hours: int = 24):
        """
        Nettoyer les fichiers anciens
        """
        import time
        
        try:
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            for filename in os.listdir(upload_folder):
                file_path = os.path.join(upload_folder, filename)
                
                if os.path.isfile(file_path):
                    file_age = current_time - os.path.getmtime(file_path)
                    
                    if file_age > max_age_seconds:
                        os.remove(file_path)
                        logger.info(f"🗑️ Fichier nettoyé: {filename}")
                        
        except Exception as e:
            logger.error(f"Erreur nettoyage fichiers: {e}")