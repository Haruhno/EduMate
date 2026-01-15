from flask import Blueprint, request, jsonify, current_app, redirect, session, url_for
import logging
import traceback
from datetime import datetime
import requests
import os
import secrets

from services.linkedin_parser import LinkedInParserService
from middleware.auth_middleware import require_auth, get_current_user

logger = logging.getLogger(__name__)

linkedin_bp = Blueprint("linkedin", __name__)

@linkedin_bp.route("/health", methods=["GET"])
def linkedin_health():
    return jsonify({
        "status": "OK",
        "service": "LinkedIn Parser",
        "timestamp": datetime.now().isoformat(),
        "mistral_configured": bool(current_app.config.get("MISTRAL_API_KEY"))
    })

@linkedin_bp.route("/parse-text", methods=["POST"])
@require_auth
def parse_linkedin_text():
    """
    Analyse un profil LinkedIn à partir de texte brut
    (copié/collé depuis LinkedIn)
    """
    try:
        data = request.get_json()

        if not data or "text" not in data:
            return jsonify({
                "success": False,
                "message": "Texte LinkedIn non fourni"
            }), 400

        linkedin_text = data["text"]
        language = data.get("language", "fr")

        llama_key = current_app.config.get("MISTRAL_API_KEY")
        if not llama_key:
            return jsonify({
                "success": False,
                "message": "Service Mistral non configuré"
            }), 500

        parser = LinkedInParserService(llama_key)
        response_data = parser.parse_linkedin_text(linkedin_text, language)

        # Métadonnées utilisateur
        user = get_current_user()
        response_data["metadata"]["userId"] = user.get("id") if user else None
        response_data["metadata"]["source"] = "LINKEDIN"

        logger.info("✅ Analyse LinkedIn terminée avec succès")
        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"❌ Erreur LinkedIn parse: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

# Étape 1 : rediriger l'utilisateur vers LinkedIn pour l'autorisation
@linkedin_bp.route('/login', methods=['GET'])
def linkedin_login():
    client_id = current_app.config.get("LINKEDIN_CLIENT_ID")
    redirect_uri = current_app.config.get("LINKEDIN_REDIRECT_URI")
    scope = "openid profile email"
    state = secrets.token_urlsafe(32)
    session["linkedin_oauth_state"] = state

    auth_url = (
        f"https://www.linkedin.com/oauth/v2/authorization?"
        f"response_type=code&client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
        f"&state={state}"
    )
    return redirect(auth_url)



# Étape 2 : callback après autorisation LinkedIn
@linkedin_bp.route('/callback', methods=['GET'])
def linkedin_callback():
    code = request.args.get("code")
    state = request.args.get("state")
    error = request.args.get("error")

    if error:
        logger.error(f"❌ Erreur LinkedIn OAuth: {error}")
        # Rediriger vers le frontend avec erreur
        return redirect("http://localhost:5173/completer-profil?linkedin=error")

    # Vérifier le state OAuth pour la sécurité
    if state != session.get("linkedin_oauth_state"):
        logger.error("❌ State OAuth invalide")
        return redirect("http://localhost:5173/completer-profil?linkedin=error")

    # Échanger le code contre un access token
    token_url = "https://www.linkedin.com/oauth/v2/accessToken"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": current_app.config.get("LINKEDIN_REDIRECT_URI"),
        "client_id": current_app.config.get("LINKEDIN_CLIENT_ID"),
        "client_secret": current_app.config.get("LINKEDIN_CLIENT_SECRET"),
    }

    response = requests.post(token_url, data=data)
    token_data = response.json()

    if "access_token" not in token_data:
        logger.error(f"❌ Échec récupération access_token: {token_data}")
        return redirect("http://localhost:5173/completer-profil?linkedin=error")

    access_token = token_data["access_token"]

    # Nouveau code OIDC
    userinfo_url = "https://api.linkedin.com/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    userinfo_resp = requests.get(userinfo_url, headers=headers).json()

    # Stocker les données LinkedIn en session avec un token temporaire
    linkedin_profile = {
        "firstName": userinfo_resp.get("given_name"),
        "lastName": userinfo_resp.get("family_name"),
        "email": userinfo_resp.get("email")
    }

    # Générer un token unique pour récupérer les données
    token = secrets.token_urlsafe(32)
    session[token] = linkedin_profile

    # Nettoyer le state OAuth
    session.pop("linkedin_oauth_state", None)

    logger.info(f"✅ Données LinkedIn stockées avec token temporaire {token}: {linkedin_profile}")

    # Rediriger vers le frontend avec le token
    return redirect(f"http://localhost:5173/completer-profil?linkedin=success&token={token}")


@linkedin_bp.route('/me', methods=['GET'])
@require_auth
def get_linkedin_me():
    """
    Récupère les données LinkedIn stockées avec un token temporaire
    """
    try:
        token = request.args.get('token')

        if not token:
            logger.warning("❌ Token manquant pour récupération LinkedIn")
            return jsonify({
                "success": False,
                "message": "Token manquant"
            }), 400

        linkedin_profile = session.get(token)

        if not linkedin_profile:
            logger.warning(f"❌ Aucune donnée LinkedIn trouvée pour token: {token}")
            logger.warning(f"Session keys: {list(session.keys())}")
            return jsonify({
                "success": False,
                "message": "Aucune donnée LinkedIn trouvée"
            }), 404

        # Nettoyer la session après récupération
        session.pop(token, None)

        logger.info("✅ Données LinkedIn récupérées et session nettoyée")

        return jsonify({
            "success": True,
            "linkedin": linkedin_profile
        }), 200

    except Exception as e:
        logger.error(f"❌ Erreur récupération données LinkedIn: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "message": "Erreur interne du serveur"
        }), 500