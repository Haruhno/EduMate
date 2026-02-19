from fastapi import APIRouter, HTTPException, Query, Header, Depends
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import logging
import requests
import jwt
import json
import uuid

from .blockchain import blockchain_manager

router = APIRouter()
logger = logging.getLogger(__name__)

def _get_exchange_start_timestamp(exchange: Dict[str, Any]) -> Optional[float]:
    skill_requested = exchange.get("skillRequested")
    if isinstance(skill_requested, str):
        try:
            skill_requested = json.loads(skill_requested)
        except Exception:
            return None
    if isinstance(skill_requested, dict):
        date_str = skill_requested.get("date")
        time_str = skill_requested.get("time")
        if date_str and time_str:
            try:
                dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)
                return dt.timestamp()
            except Exception:
                return None
    return None

async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """Extraire l'ID utilisateur du token JWT"""
    if not authorization or not authorization.startswith("Bearer "):
        # Pour la démo, retourner un utilisateur par défaut
        return "d755226e-bb7b-4bec-9af0-e578da8362dc"
    
    try:
        token = authorization.split(" ")[1]
        # NOTE: En production, valider le token avec une clé secrète
        # Pour la démo, on décode simplement sans validation
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get("id") or decoded.get("sub") or decoded.get("userId")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide")
        
        return str(user_id)
    except Exception as e:
        logger.warning(f"Erreur décoding token: {e}, utilisant user par défaut")
        return "d755226e-bb7b-4bec-9af0-e578da8362dc"

async def get_user_skills(user_id: str, authorization: Optional[str] = None) -> Dict[str, Any]:
    """Récupérer les compétences d'un utilisateur depuis auth-service"""
    try:
        headers = {"Authorization": authorization} if authorization else {}
        
        response = requests.get(
            f"{blockchain_manager.auth_service_url}/api/users/{user_id}",
            headers=headers,
            timeout=5
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        user_data = response.json()["data"]
        
        return {
            "userId": user_id,
            "skillsToTeach": user_data.get("skillsToTeach", []),
            "skillsToLearn": user_data.get("skillsToLearn", []),
            "firstName": user_data.get("firstName", ""),
            "lastName": user_data.get("lastName", ""),
            "email": user_data.get("email", "")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération skills: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur récupération skills: {str(e)}")

@router.post("/skill-exchange")
async def create_skill_exchange(
    exchange_data: Dict[str, Any],
    student_user_id: str = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Créer une demande d'échange de compétence"""
    try:
        logger.info(f"[CREATE_SKILL_EXCHANGE] Request: {exchange_data}")
        
        tutor_id = exchange_data.get("tutorId")
        skill_offered = exchange_data.get("skillOffered")
        skill_requested = exchange_data.get("skillRequested")
        
        if not tutor_id or not skill_offered or not skill_requested:
            raise HTTPException(
                status_code=400,
                detail="tutorId, skillOffered et skillRequested sont requis"
            )
        
        # Vérifier que les deux utilisateurs existent
        student_skills = await get_user_skills(student_user_id, authorization)
        tutor_skills = await get_user_skills(tutor_id, authorization)
        
        # Générer un ID frontend unique
        frontend_id = str(uuid.uuid4())
        
        # Créer l'échange sur la blockchain
        result = blockchain_manager.create_skill_exchange(
            student_user_id=student_user_id,
            tutor_user_id=tutor_id,
            skill_offered=json.dumps(skill_offered),
            skill_requested=json.dumps(skill_requested),
            frontend_exchange_id=frontend_id
        )
        
        # Enrichir avec les infos utilisateurs
        return {
            "success": True,
            "data": {
                "id": result["exchangeId"],
                "frontendId": result["frontendId"],
                "studentId": student_user_id,
                "tutorId": tutor_id,
                "skillOffered": skill_offered,
                "skillRequested": skill_requested,
                "status": result["status"],
                "transactionHash": result["transactionHash"],
                "student": {
                    "id": student_user_id,
                    "firstName": student_skills["firstName"],
                    "lastName": student_skills["lastName"],
                    "email": student_skills["email"]
                },
                "tutor": {
                    "id": tutor_id,
                    "firstName": tutor_skills["firstName"],
                    "lastName": tutor_skills["lastName"],
                    "email": tutor_skills["email"]
                }
            },
            "message": "Demande d'échange créée avec succès"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CREATE_SKILL_EXCHANGE] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/skill-exchange")
async def get_skill_exchanges(
    userId: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Récupérer les échanges de compétences d'un utilisateur"""
    try:
        # Si userId n'est pas fourni, utiliser l'utilisateur connecté
        target_user_id = userId or user_id
        
        logger.info(f"[GET_SKILL_EXCHANGES] User: {target_user_id}, Status filter: {status}")
        
        # Récupérer tous les échanges de l'utilisateur depuis la blockchain
        exchanges = blockchain_manager.get_user_skill_exchanges(target_user_id)
        
        # Filtrer par statut si demandé
        if status:
            exchanges = [ex for ex in exchanges if ex["status"] == status.upper()]
        
        # Enrichir avec les infos utilisateurs
        enriched_exchanges = []
        for exchange in exchanges:
            try:
                student_info = await get_user_skills(exchange["studentId"], authorization)
                tutor_info = await get_user_skills(exchange["tutorId"], authorization)
                
                skill_offered_obj = json.loads(exchange["skillOffered"]) if isinstance(exchange["skillOffered"], str) else exchange["skillOffered"]
                skill_requested_obj = json.loads(exchange["skillRequested"]) if isinstance(exchange["skillRequested"], str) else exchange["skillRequested"]

                booking_info = None
                if isinstance(skill_requested_obj, dict) and skill_requested_obj.get("date") and skill_requested_obj.get("time"):
                    booking_info = {
                        "date": skill_requested_obj.get("date"),
                        "time": skill_requested_obj.get("time"),
                        "duration": skill_requested_obj.get("duration")
                    }

                enriched_exchanges.append({
                    **exchange,
                    "skillOffered": skill_offered_obj,
                    "skillRequested": skill_requested_obj,
                    "bookings": [booking_info] if booking_info else [],
                    "student": {
                        "id": exchange["studentId"],
                        "firstName": student_info["firstName"],
                        "lastName": student_info["lastName"],
                        "email": student_info["email"]
                    },
                    "tutor": {
                        "id": exchange["tutorId"],
                        "firstName": tutor_info["firstName"],
                        "lastName": tutor_info["lastName"],
                        "email": tutor_info["email"]
                    }
                })
            except Exception as e:
                logger.warning(f"Could not enrich exchange {exchange['id']}: {e}")
                enriched_exchanges.append(exchange)
        
        return {
            "success": True,
            "data": enriched_exchanges
        }
        
    except Exception as e:
        logger.error(f"[GET_SKILL_EXCHANGES] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/skill-exchange/{exchange_id}")
async def get_skill_exchange_details(
    exchange_id: int,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Récupérer les détails d'un échange"""
    try:
        logger.info(f"[GET_SKILL_EXCHANGE_DETAILS] Exchange ID: {exchange_id}")
        
        exchange = blockchain_manager.get_skill_exchange(exchange_id)
        
        # Enrichir avec les infos utilisateurs
        student_info = await get_user_skills(exchange["studentId"], authorization)
        tutor_info = await get_user_skills(exchange["tutorId"], authorization)
        
        return {
            "success": True,
            "data": {
                **exchange,
                "skillOffered": json.loads(exchange["skillOffered"]) if isinstance(exchange["skillOffered"], str) else exchange["skillOffered"],
                "skillRequested": json.loads(exchange["skillRequested"]) if isinstance(exchange["skillRequested"], str) else exchange["skillRequested"],
                "student": {
                    "id": exchange["studentId"],
                    "firstName": student_info["firstName"],
                    "lastName": student_info["lastName"],
                    "email": student_info["email"]
                },
                "tutor": {
                    "id": exchange["tutorId"],
                    "firstName": tutor_info["firstName"],
                    "lastName": tutor_info["lastName"],
                    "email": tutor_info["email"]
                }
            }
        }
        
    except Exception as e:
        logger.error(f"[GET_SKILL_EXCHANGE_DETAILS] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/skill-exchange/{exchange_id}/accept")
async def accept_skill_exchange(
    exchange_id: int,
    tutor_user_id: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """Accepter une demande d'échange"""
    try:
        logger.info(f"[ACCEPT_SKILL_EXCHANGE] Exchange: {exchange_id}, Tutor: {tutor_user_id}")
        
        # Vérifier que l'utilisateur est bien le tuteur
        exchange = blockchain_manager.get_skill_exchange(exchange_id)
        if exchange["tutorId"] != tutor_user_id:
            raise HTTPException(
                status_code=403,
                detail="Seul le tuteur peut accepter cet échange"
            )

        start_ts = _get_exchange_start_timestamp(exchange)
        if start_ts is not None and datetime.now(timezone.utc).timestamp() >= start_ts:
            raise HTTPException(
                status_code=400,
                detail="La date du cours est depassee, l'acceptation n'est plus possible"
            )
        
        # Accepter sur la blockchain
        result = blockchain_manager.accept_skill_exchange(exchange_id, tutor_user_id)
        
        return {
            "success": True,
            "data": result,
            "message": "Échange accepté"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ACCEPT_SKILL_EXCHANGE] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/skill-exchange/{exchange_id}/reject")
async def reject_skill_exchange(
    exchange_id: int,
    user_id: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """Rejeter une demande d'échange"""
    try:
        logger.info(f"[REJECT_SKILL_EXCHANGE] Exchange: {exchange_id}, User: {user_id}")
        
        exchange = blockchain_manager.get_skill_exchange(exchange_id)
        if user_id != exchange.get("tutorId"):
            raise HTTPException(
                status_code=403,
                detail="Seul le tuteur peut refuser cet échange"
            )

        start_ts = _get_exchange_start_timestamp(exchange)
        if start_ts is not None and datetime.now(timezone.utc).timestamp() >= start_ts:
            raise HTTPException(
                status_code=400,
                detail="La date du cours est depassee, le refus n'est plus possible"
            )

        if exchange.get("status") not in ["PENDING", "ACCEPTED"]:
            raise HTTPException(
                status_code=400,
                detail="Échange déjà terminé"
            )
        
        # Rejeter sur la blockchain
        result = blockchain_manager.reject_skill_exchange(exchange_id, exchange.get("tutorId"))
        
        return {
            "success": True,
            "data": result,
            "message": "Échange rejeté"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[REJECT_SKILL_EXCHANGE] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/skill-exchange/{exchange_id}/complete")
async def complete_skill_exchange(
    exchange_id: int,
    user_id: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """Compléter un échange de compétence"""
    try:
        logger.info(f"[COMPLETE_SKILL_EXCHANGE] Exchange: {exchange_id}, User: {user_id}")
        
        # Vérifier que l'échange est accepté
        exchange = blockchain_manager.get_skill_exchange(exchange_id)
        if exchange["status"] != "ACCEPTED":
            raise HTTPException(
                status_code=400,
                detail="L'échange doit être accepté avant de pouvoir être complété"
            )
        
        # Compléter sur la blockchain
        result = blockchain_manager.complete_skill_exchange(exchange_id, user_id)
        
        return {
            "success": True,
            "data": result,
            "message": "Échange complété"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[COMPLETE_SKILL_EXCHANGE] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/skill-exchange/{exchange_id}/submit-review")
async def submit_exchange_review(
    exchange_id: int,
    review_data: Dict[str, Any],
    user_id: str = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Soumettre un avis pour un échange de compétences."""
    try:
        logger.info(f"[SUBMIT_EXCHANGE_REVIEW] Exchange {exchange_id}, reviewer {user_id}")

        exchange = blockchain_manager.get_skill_exchange(exchange_id)
        if user_id not in [exchange.get("studentId"), exchange.get("tutorId")]:
            raise HTTPException(status_code=403, detail="Vous n'êtes pas partie de cet échange")

        reviewer_type = "tutor" if user_id == exchange.get("tutorId") else "student"
        target_user_id = review_data.get("targetUserId") or (
            exchange.get("studentId") if reviewer_type == "tutor" else exchange.get("tutorId")
        )

        if target_user_id not in [exchange.get("studentId"), exchange.get("tutorId")]:
            raise HTTPException(status_code=400, detail="targetUserId invalide")

        comment = (review_data.get("comment") or "").strip()
        if not comment:
            raise HTTPException(status_code=400, detail="Avis vide requis")

        review_payload = {
            "bookingId": str(exchange.get("frontendId") or f"exchange-{exchange_id}"),
            "reviewerId": str(user_id),
            "targetUserId": str(target_user_id),
            "comment": comment,
            "reviewerType": reviewer_type,
            "rating": review_data.get("rating")
        }

        headers = {"Authorization": authorization} if authorization else {}
        response = requests.post(
            f"{blockchain_manager.auth_service_url}/api/reviews",
            json=review_payload,
            headers=headers,
            timeout=5
        )

        if response.status_code not in [200, 201]:
            logger.error(f"Erreur authservice reviews: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Erreur sauvegarde avis")

        return {
            "success": True,
            "message": "Avis enregistré (non confirmé)",
            "data": response.json().get("review") or response.json()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SUBMIT_EXCHANGE_REVIEW] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/skill-exchange/{exchange_id}/confirm-review")
async def confirm_exchange_review(
    exchange_id: int,
    user_id: str = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Confirmer un avis pour un échange de compétences."""
    try:
        logger.info(f"[CONFIRM_EXCHANGE_REVIEW] Exchange {exchange_id}, reviewer {user_id}")

        exchange = blockchain_manager.get_skill_exchange(exchange_id)
        if user_id not in [exchange.get("studentId"), exchange.get("tutorId")]:
            raise HTTPException(status_code=403, detail="Vous n'êtes pas partie de cet échange")

        booking_id = str(exchange.get("frontendId") or f"exchange-{exchange_id}")
        headers = {"Authorization": authorization} if authorization else {}
        response = requests.post(
            f"{blockchain_manager.auth_service_url}/api/reviews/{booking_id}/{user_id}/confirm",
            headers=headers,
            timeout=5
        )

        if response.status_code not in [200, 201]:
            logger.error(f"Erreur confirmation review: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Erreur confirmation avis")

        result = response.json()
        
        # ✅ Si les DEUX parties ont confirmé l'avis, compléter l'échange sur la blockchain
        logger.info(f"[CONFIRM_EXCHANGE_REVIEW] Response result: {result}")
        
        # Vérifier si les deux reviews ont été confirmées (allPartiesConfirmed ou similar)
        if result.get("allPartiesConfirmed") or result.get("reviewsConfirmed"):
            logger.info(f"[CONFIRM_EXCHANGE_REVIEW] Toutes les parties ont confirmé, passage en COMPLETED")
            
            try:
                complete_result = blockchain_manager.complete_skill_exchange(exchange_id, user_id)
                logger.info(f"[CONFIRM_EXCHANGE_REVIEW] Échange complété: {complete_result}")
            except Exception as complete_error:
                logger.warning(f"[CONFIRM_EXCHANGE_REVIEW] Erreur completion échange: {complete_error}")
                # Ne pas bloquer le flow si la completion échoue
        
        exchange_status = blockchain_manager.get_skill_exchange(exchange_id).get("status", "UNKNOWN")

        return {
            "success": True,
            "message": "Avis confirmé de manière irréversible",
            "exchangeStatus": exchange_status,
            "allPartiesConfirmed": result.get("allPartiesConfirmed") or result.get("reviewsConfirmed"),
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CONFIRM_EXCHANGE_REVIEW] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/skill-exchange/user/{user_id}/skills")
async def get_user_skills_endpoint(
    user_id: str,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Récupérer les compétences d'un utilisateur"""
    try:
        skills = await get_user_skills(user_id, authorization)
        return {
            "success": True,
            "data": skills
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET_USER_SKILLS] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
