#!/usr/bin/env python3
# src/app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv
from routes.cv_routes import cv_bp
from routes.linkedin_routes import linkedin_bp
from middleware.auth_middleware import auth_middleware

# Charger les variables d'environnement
load_dotenv()

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cv-parser.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            os.getenv("FRONTEND_URL", "http://localhost:5173")
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Configuration
app.config.update(
    MAX_CONTENT_LENGTH=10 * 1024 * 1024,  # 10MB max
    # UPLOAD_FOLDER='uploads',  # REMOVED - Plus besoin de dossier upload
    ALLOWED_EXTENSIONS={'pdf', 'doc', 'docx', 'txt'},
    SECRET_KEY=os.getenv('FLASK_SECRET_KEY', 'dev-secret-key'),
    MISTRAL_API_KEY=os.getenv('MISTRAL_API_KEY'),
    RATE_LIMIT=os.getenv('RATE_LIMIT', '100 per day'),
    LINKEDIN_CLIENT_ID=os.getenv("LINKEDIN_CLIENT_ID"),
    LINKEDIN_CLIENT_SECRET=os.getenv("LINKEDIN_CLIENT_SECRET"),
    LINKEDIN_REDIRECT_URI=os.getenv("LINKEDIN_REDIRECT_URI", "http://localhost:5001/api/linkedin/callback"),
    # Session configuration for cross-origin (dev)
    SESSION_COOKIE_SAMESITE="None",
    SESSION_COOKIE_SECURE=False,
    SESSION_COOKIE_HTTPONLY=True,
    PERMANENT_SESSION_LIFETIME=1800  # 30 minutes
)

# Routes
app.register_blueprint(cv_bp, url_prefix='/api/cv')
app.register_blueprint(linkedin_bp, url_prefix="/api/linkedin")

# Route de santé
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'OK',
        'service': 'CV Parser Service',
        'version': '1.0.0',
        'mode': 'MEMORY_ONLY',
        'timestamp': os.getenv('TIMESTAMP', '2024-01-01T00:00:00Z')
    })

# Gestion des erreurs
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': 'Route non trouvée',
        'error': str(error)
    }), 404

@app.errorhandler(413)
def too_large(error):
    return jsonify({
        'success': False,
        'message': 'Fichier trop volumineux (max 10MB)',
        'error': str(error)
    }), 413

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Erreur interne: {error}")
    return jsonify({
        'success': False,
        'message': 'Erreur interne du serveur',
        'error': str(error) if app.debug else None
    }), 500

if __name__ == '__main__':
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    logger.info(f"Démarrage du service CV Parser sur {host}:{port}")
    logger.info(f"Mode: 100% en mémoire (MEMORY_ONLY)")
    
    app.run(host=host, port=port, debug=debug)