"""
Endpoint pour récupérer les skill exchanges acceptés pour l'historique de cours
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional, Dict, Any
import logging

from .skill_exchange import get_current_user, get_user_skills
from .booking import BOOKING_ANNONCE_MAP
import requests
from .blockchain import blockchain_manager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/skill-exchange/history/accepted")
async def get_accepted_skill_exchanges_for_history(
    user_id: str = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Récupérer les skill exchanges acceptés pour l'historique de cours du tuteur ou étudiant"""
    try:
        logger.info(f"[GET_ACCEPTED_EXCHANGES_HISTORY] User: {user_id}")
        
        # Récupérer tous les échanges de l'utilisateur
        all_exchanges = blockchain_manager.get_user_skill_exchanges(user_id)
        
        # Filtrer pour les échanges acceptés
        accepted_exchanges = [ex for ex in all_exchanges if ex.get("status", "").upper() == "ACCEPTED"]
        
        logger.info(f"[GET_ACCEPTED_EXCHANGES_HISTORY] Found {len(accepted_exchanges)} accepted exchanges")
        
        # Enrichir les données  
        enriched_exchanges = []
        for exchange in accepted_exchanges:
            try:
                import json
                
                student_id = exchange.get("studentId")
                tutor_id = exchange.get("tutorId")
                
                # Enrichir avec infos utilisateur
                student_info = await get_user_skills(student_id, authorization) if student_id else None
                tutor_info = await get_user_skills(tutor_id, authorization) if tutor_id else None
                
                # Parser les skills
                skills_offered = exchange.get("skillOffered")
                skills_requested = exchange.get("skillRequested")
                
                if isinstance(skills_offered, str):
                    try:
                        skills_offered_obj = json.loads(skills_offered)
                        skills_offered = skills_offered_obj.get("skills", []) if isinstance(skills_offered_obj, dict) else []
                    except:
                        skills_offered = []
                elif isinstance(skills_offered, dict):
                    skills_offered = skills_offered.get("skills", []) if "skills" in skills_offered else [skills_offered]
                        
                booking_info = None
                if isinstance(skills_requested, str):
                    try:
                        skills_requested_obj = json.loads(skills_requested)
                        skills_requested = skills_requested_obj.get("skills", []) if isinstance(skills_requested_obj, dict) else []
                        course_description = skills_requested_obj.get("description", "")
                        if isinstance(skills_requested_obj, dict) and skills_requested_obj.get("date") and skills_requested_obj.get("time"):
                            booking_info = {
                                "date": skills_requested_obj.get("date"),
                                "time": skills_requested_obj.get("time"),
                                "duration": skills_requested_obj.get("duration")
                            }
                    except:
                        skills_requested = []
                        course_description = ""
                elif isinstance(skills_requested, dict):
                    skills_requested = skills_requested.get("skills", []) if "skills" in skills_requested else [skills_requested]
                    course_description = skills_requested.get("description", "") if isinstance(skills_requested, dict) else ""
                    if skills_requested.get("date") and skills_requested.get("time"):
                        booking_info = {
                            "date": skills_requested.get("date"),
                            "time": skills_requested.get("time"),
                            "duration": skills_requested.get("duration")
                        }
                else:
                    course_description = ""
                
                annonce_info = None
                annonce_id = BOOKING_ANNONCE_MAP.get(exchange.get("frontendId"))
                if annonce_id:
                    try:
                        annonce_resp = requests.get(
                            f"{blockchain_manager.auth_service_url}/api/annonces/{annonce_id}",
                            headers={"Authorization": authorization} if authorization else {},
                            timeout=5
                        )
                        if annonce_resp.status_code == 200:
                            annonce_data = annonce_resp.json().get("data", {})
                            annonce_info = {
                                "id": annonce_data.get("id"),
                                "title": annonce_data.get("title"),
                                "subject": annonce_data.get("subject"),
                                "description": annonce_data.get("description"),
                                "level": annonce_data.get("level"),
                                "teachingMode": annonce_data.get("teachingMode")
                            }
                    except Exception as e:
                        logger.warning(f"[GET_ACCEPTED_EXCHANGES_HISTORY] Erreur annonce {annonce_id}: {e}")

                enriched_exchanges.append({
                    "id": exchange.get("id"),
                    "studentId": student_id,
                    "tutorId": tutor_id,
                    "frontendId": exchange.get("frontendId"),
                    "annonceId": annonce_id,
                    "annonce": annonce_info,
                    "student": {
                        "id": student_id,
                        "firstName": student_info.get("firstName") if student_info else "",
                        "lastName": student_info.get("lastName") if student_info else "",
                        "email": student_info.get("email") if student_info else ""
                    } if student_info else None,
                    "tutor": {
                        "id": tutor_id,
                        "firstName": tutor_info.get("firstName") if tutor_info else "",
                        "lastName": tutor_info.get("lastName") if tutor_info else "",
                        "email": tutor_info.get("email") if tutor_info else ""
                    } if tutor_info else None,
                    "status": exchange.get("status"),
                    "skillsOffered": skills_offered,
                    "skillsRequested": skills_requested,
                    "bookings": [booking_info] if booking_info else [],
                    "description": course_description,
                    "createdAt": exchange.get("createdAt"),
                    "updatedAt": exchange.get("updatedAt"),
                    "transactionHash": exchange.get("transactionHash")
                })
            except Exception as e:
                logger.warning(f"[GET_ACCEPTED_EXCHANGES_HISTORY] Error enriching exchange: {e}")
                enriched_exchanges.append(exchange)
        
        return {
            "success": True,
            "data": enriched_exchanges,
            "count": len(enriched_exchanges)
        }
        
    except Exception as e:
        logger.error(f"[GET_ACCEPTED_EXCHANGES_HISTORY] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur récupération historique: {str(e)}")
