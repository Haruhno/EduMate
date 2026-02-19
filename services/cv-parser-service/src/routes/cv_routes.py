from flask import Blueprint, request, jsonify, current_app
import logging
from datetime import datetime
import traceback

from src.services.cv_parser import CVParserService
from src.utils.file_utils import FileUtils
from src.middleware.auth_middleware import require_auth, get_current_user
from src.services.pdf_extractor import PDFExtractor
from src.services.docx_extractor import DOCXExtractor

logger = logging.getLogger(__name__)

cv_bp = Blueprint('cv', __name__)
file_utils = FileUtils()

@cv_bp.route('/health', methods=['GET'])
def cv_health():
    """Vérifier la santé du service CV"""
    return jsonify({
        'status': 'OK',
        'service': 'CV Parser',
        'timestamp': datetime.now().isoformat(),
        'mistral_configured': bool(current_app.config.get('MISTRAL_API_KEY')),
        'mode': 'MEMORY_ONLY'
    })

@cv_bp.route('/parse', methods=['POST'])
@require_auth
def parse_cv():
    """
    Analyser un fichier CV uploadé directement en mémoire
    1️⃣ Extraire le texte comme parse-raw et le logger
    2️⃣ Envoyer ce texte à Mistral pour extraction JSON
    """
    try:
        if 'cv' not in request.files:
            return jsonify({'success': False, 'message': 'Aucun fichier CV fourni'}), 400

        file = request.files['cv']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'Nom de fichier vide'}), 400

        # Lire le fichier en mémoire
        file_bytes = file.read()
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''

        # Extraire le texte selon le format (comme parse-raw)
        if file_ext == 'pdf':
            text = PDFExtractor.extract_text_from_pdf_bytes(file_bytes)
        elif file_ext in ['docx', 'doc']:
            text = DOCXExtractor.extract_text_from_docx_bytes(file_bytes)
        elif file_ext == 'txt':
            text = file_bytes.decode('utf-8', errors='ignore')
        else:
            return jsonify({'success': False, 'message': f'Format non supporté: {file_ext}'}), 400

        # Log simple du texte extrait
        logger.info(f"✅ Texte extrait du CV ({len(text)} caractères)")

        # Vérifier que le texte est suffisamment long
        if len(text.strip()) < 50:
            logger.warning("⚠️ Texte extrait trop court pour analyse Mistral, fallback extraction locale")
            cv_data = CVParserService("")._extract_locally(text)
        else:
            # Analyse avec Mistral
            logger.info("🤖 Envoi du texte à Mistral pour extraction JSON...")
            mistral_key = current_app.config.get('MISTRAL_API_KEY')
            if not mistral_key:
                return jsonify({'success': False, 'message': 'Service Mistral non configuré'}), 500

            cv_parser = CVParserService(mistral_key)
            cv_data = cv_parser.mistral_service.analyze_cv_text(text, language=request.form.get('language', 'fr'))

        # Formater pour frontend
        response_data = CVParserService("").format_for_frontend(cv_data)

        # Ajouter métadonnées
        user = get_current_user()
        response_data['metadata']['userId'] = user.get('id') if user else None
        response_data['metadata']['filename'] = file.filename
        response_data['metadata']['originalFilename'] = file.filename
        response_data['metadata']['textLength'] = len(text)

        logger.info(f"✅ CV analysé avec succès (parse combiné) : {file.filename}")
        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"❌ Erreur parse combiné: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500


@cv_bp.route('/parse-text', methods=['POST'])
@require_auth
def parse_cv_text():
    """
    Analyser du texte CV directement
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'message': 'Texte CV non fourni'
            }), 400
        
        cv_text = data['text']
        language = data.get('language', 'fr')
        
        if len(cv_text.strip()) < 50:
            return jsonify({
                'success': False,
                'message': 'Texte CV trop court (min 50 caractères)'
            }), 400
        
        # Initialiser le service
        mistral_key = current_app.config.get('MISTRAL_API_KEY')
        if not mistral_key:
            return jsonify({
                'success': False,
                'message': 'Service Mistral non configuré'
            }), 500
        
        cv_parser = CVParserService(mistral_key)
        
        # Analyser directement avec Mistral
        from src.services.mistral_service import MistralCVService
        mistral_service = MistralCVService(mistral_key)
        cv_data = mistral_service.analyze_cv_text(cv_text, language)
        
        # Formater la réponse
        response_data = cv_parser.format_for_frontend(cv_data)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Erreur analyse texte: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@cv_bp.route('/batch-parse', methods=['POST'])
@require_auth
def batch_parse_cvs():
    """
    Analyser plusieurs CV en batch (100% en mémoire)
    """
    try:
        if 'cvs' not in request.files:
            return jsonify({
                'success': False,
                'message': 'Aucun fichier CV fourni'
            }), 400
        
        files = request.files.getlist('cvs')
        
        if len(files) == 0:
            return jsonify({
                'success': False,
                'message': 'Aucun fichier CV fourni'
            }), 400
        
        if len(files) > 10:
            return jsonify({
                'success': False,
                'message': 'Maximum 10 fichiers par batch'
            }), 400
        
        language = request.form.get('language', 'fr')
        results = []
        
        mistral_key = current_app.config.get('MISTRAL_API_KEY')
        if not mistral_key:
            return jsonify({
                'success': False,
                'message': 'Service Mistral non configuré'
            }), 500
        
        cv_parser = CVParserService(mistral_key)
        
        for file in files:
            if file.filename:
                try:
                    # Lire le fichier en mémoire
                    file_bytes = file.read()
                    
                    # Analyser directement depuis les bytes
                    cv_data = cv_parser.parse_cv_bytes(file_bytes, file.filename, language)
                    
                    results.append({
                        'filename': file.filename,
                        'success': True,
                        'data': cv_parser.format_for_frontend(cv_data)['data'],
                        'quality': cv_data.validation.get('quality')
                    })
                    
                    logger.info(f"✅ CV batch analysé: {file.filename}")
                    
                except Exception as e:
                    logger.error(f"❌ Erreur avec {file.filename}: {e}")
                    results.append({
                        'filename': file.filename,
                        'success': False,
                        'error': str(e)
                    })
        
        return jsonify({
            'success': True,
            'message': f'{len([r for r in results if r["success"]])}/{len(results)} CV analysés avec succès',
            'results': results
        }), 200
        
    except Exception as e:
        logger.error(f"Erreur batch: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
    
@cv_bp.route('/parse-raw', methods=['POST'])
@require_auth
def parse_cv_raw():
    """
    Retourne le texte brut du CV uploadé
    """
    try:
        if 'cv' not in request.files:
            return jsonify({'success': False, 'message': 'Aucun fichier CV fourni'}), 400

        file = request.files['cv']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'Nom de fichier vide'}), 400

        # Lire le fichier en mémoire
        file_bytes = file.read()
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''

        # Extraire le texte selon le format
        if file_ext == 'pdf':
            text = PDFExtractor.extract_text_from_pdf_bytes(file_bytes)
        elif file_ext in ['docx', 'doc']:
            text = DOCXExtractor.extract_text_from_docx_bytes(file_bytes)
        elif file_ext == 'txt':
            text = file_bytes.decode('utf-8', errors='ignore')
        else:
            return jsonify({'success': False, 'message': f'Format non supporté: {file_ext}'}), 400

        # Afficher le texte dans la console du serveur
        logger.info(f"✅ Texte brut du CV extrait ({len(text)} caractères)")

        return jsonify({'success': True, 'filename': file.filename, 'text': text}), 200

    except Exception as e:
        logger.error(f"Erreur parse-raw: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@cv_bp.route('/validate', methods=['POST'])
@require_auth
def validate_cv_data():
    """
    Valider des données CV existantes
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Données non fournies'
            }), 400
        
        # Logique de validation simple
        cv_data = data.get('cvData', {})
        issues = []
        suggestions = []
        
        # Vérifier les champs obligatoires
        if not cv_data.get('firstName'):
            issues.append('Prénom manquant')
            suggestions.append('Ajoutez votre prénom')
        
        if not cv_data.get('lastName'):
            issues.append('Nom manquant')
            suggestions.append('Ajoutez votre nom')
        
        if not cv_data.get('email'):
            issues.append('Email manquant')
            suggestions.append('Ajoutez votre adresse email')
        
        return jsonify({
            'success': True,
            'message': 'Données CV validées',
            'validation': {
                'isValid': len(issues) == 0,
                'issues': issues,
                'suggestions': suggestions
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Erreur validation: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500