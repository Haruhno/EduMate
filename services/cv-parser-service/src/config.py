import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key')
    DEBUG = os.getenv('FLASK_ENV', 'development') == 'development'
    
    # Fichiers - MODE MÉMOIRE UNIQUEMENT
    # UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')  # REMOVED
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt'}
    PROCESSING_MODE = 'MEMORY_ONLY'  # Nouveau: indique le mode mémoire
    
    # Mistral
    MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY')
    MISTRAL_MODEL = os.getenv('MISTRAL_MODEL', 'mistralai/mistral-7b-instruct:free')
    MISTRAL_FALLBACK_MODEL = os.getenv('MISTRAL_FALLBACK_MODEL', 'mistralai/mistral-small-latest')
    MISTRAL_MAX_TOKENS = int(os.getenv('MISTRAL_MAX_TOKENS', 800))  # Optimisé: 2000 → 800
    MISTRAL_TEMPERATURE = float(os.getenv('MISTRAL_TEMPERATURE', 0.3))
    MISTRAL_TIMEOUT = int(os.getenv('MISTRAL_TIMEOUT', 15))  # Timeout 15 secondes pour éviter les appels infinis
    
    # Cache
    CACHE_TIMEOUT = int(os.getenv('CACHE_TIMEOUT', 3600))  # 1 heure
    CACHE_DIR = os.getenv('CACHE_DIR', '.cache')
    
    # Rate limiting
    RATE_LIMIT = os.getenv('RATE_LIMIT', '100 per day')
    
    # CORS
    CORS_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        os.getenv('FRONTEND_URL', 'http://localhost:5173')
    ]
    
    # Database (si besoin)
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'cv-parser.log')
    
    # Mémoire (nouveaux paramètres)
    MAX_MEMORY_BUFFER = int(os.getenv('MAX_MEMORY_BUFFER', 50 * 1024 * 1024))  # 50MB max en mémoire
    MAX_PARALLEL_PROCESSES = int(os.getenv('MAX_PARALLEL_PROCESSES', 5))