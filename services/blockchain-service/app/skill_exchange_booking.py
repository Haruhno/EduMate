"""
Endpoints pour les réservations d'échange de compétences
Ces réservations sont gratuites (0 EDU Coins) et fonctionnent comme des réservations normales
mais sans transaction monétaire.
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
import logging

from .blockchain import blockchain_manager
from .booking import get_current_user, verify_user_and_get_role, BOOKING_ANNONCE_MAP

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/booking/skill-exchange")
async def create_skill_exchange_booking(
    booking_data: Dict[str, Any],
    student_user_id: str = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Créer une réservation d'échange de compétences (gratuit - 0 EDU Coins)"""
    try:
        logger.info(f"[CREATE_SKILL_EXCHANGE_BOOKING] Student: {student_user_id}, Tutor: {booking_data.get('tutorId')}")
        
        tutor_id = booking_data.get("tutorId")
        if not tutor_id:
            raise HTTPException(status_code=400, detail="tutorId requis")
        
        # Vérifier que les utilisateurs existent
        student_user_id, student_role = await verify_user_and_get_role(student_user_id, authorization)
        tutor_user_id, tutor_role = await verify_user_and_get_role(tutor_id, authorization)
        
        logger.info(f"[CREATE_SKILL_EXCHANGE_BOOKING] Users verified - Student: {student_user_id}, Tutor: {tutor_user_id}")
        
        # Générer un ID frontend unique
        frontend_id = str(uuid.uuid4())
        
        # Préparer les données de réservation
        duration = booking_data.get("duration", 60)
        date_str = booking_data.get("date")
        time_str = booking_data.get("time")
        
        # Convertir la date et heure en timestamp (UTC)
        try:
            # Format: "2026-02-18" et "11:30"
            from datetime import timezone
            datetime_str = f"{date_str} {time_str}"
            booking_datetime = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M")
            # Conversion UTC pour éviter les problèmes de timezone
            booking_datetime_utc = booking_datetime.replace(tzinfo=timezone.utc)
            start_timestamp = int(booking_datetime_utc.timestamp())
            logger.info(f"[CREATE_SKILL_EXCHANGE_BOOKING] Date/heure spécifiée: {datetime_str}, Timestamp: {start_timestamp}")
        except Exception as e:
            logger.error(f"[CREATE_SKILL_EXCHANGE_BOOKING] Erreur conversion date/heure: {str(e)}")
            start_timestamp = int(datetime.utcnow().timestamp())
        
        booking_info = {
            "studentId": student_user_id,
            "tutorId": tutor_user_id,
            "annonceId": booking_data.get("annonceId", "skill-exchange"),
            "date": date_str,
            "time": time_str,
            "duration": duration,
            "amount": 0,  # Toujours gratuit pour les échanges
            "description": booking_data.get("description", ""),
            "studentNotes": booking_data.get("studentNotes", ""),
            "isSkillExchange": True,
            "skillsOffered": booking_data.get("skillsOffered", []),
            "skillsRequested": booking_data.get("skillsRequested", []),
            "status": "pending"
        }
        
        # Stocker le mapping pour retrouver annonceId
        BOOKING_ANNONCE_MAP[frontend_id] = booking_info["annonceId"]
        
        # Créer l'échange de compétence sur la blockchain (gratuit - pas de transaction d'argent)
        # Formater les skills en JSON strings comme attendu par le contrat SkillExchange
        import json
        course_description = booking_info.get("studentNotes") or booking_info.get("description") or ""

        skill_offered_json = json.dumps({
            "skills": booking_info["skillsOffered"]
        })
        skill_requested_json = json.dumps({
            "skills": booking_info["skillsRequested"],
            "description": course_description,
            "date": booking_info.get("date"),
            "time": booking_info.get("time"),
            "duration": booking_info.get("duration")
        })
        
        result = blockchain_manager.create_skill_exchange(
            student_user_id=student_user_id,
            tutor_user_id=tutor_user_id,
            skill_offered=skill_offered_json,
            skill_requested=skill_requested_json,
            frontend_exchange_id=frontend_id
        )
        
        logger.info(f"[CREATE_SKILL_EXCHANGE_BOOKING] Exchange créé avec ID: {result.get('exchangeId')}")
        
        # Enrichir la réponse avec les informations complètes
        return {
            "success": True,
            "data": {
                "id": result.get("exchangeId"),
                "frontendId": frontend_id,
                "studentId": student_user_id,
                "tutorId": tutor_user_id,
                "amount": 0,
                "status": "pending",
                "isSkillExchange": True,
                "skillsOffered": booking_info["skillsOffered"],
                "skillsRequested": booking_info["skillsRequested"],
                "date": booking_info["date"],
                "time": booking_info["time"],
                "duration": booking_info["duration"],
                "description": booking_info["description"],
                "transactionHash": result.get("transactionHash"),
                "createdAt": datetime.utcnow().isoformat()
            },
            "message": "Demande d'échange de compétences créée avec succès"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CREATE_SKILL_EXCHANGE_BOOKING] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/booking/{bookingId}/accept-exchange")
async def accept_skill_exchange(
    bookingId: str,
    user_id: str = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Accepter un échange de compétences (par le tuteur)"""
    try:
        logger.info(f"[ACCEPT_SKILL_EXCHANGE] Booking: {bookingId}, User: {user_id}")
        
        # Récupérer les détails de la réservation
        booking_status = blockchain_manager.get_booking_status(bookingId)
        
        if not booking_status:
            raise HTTPException(status_code=404, detail="Réservation non trouvée")
        
        # Vérifier que c'est bien le tuteur qui accepte
        tutor_wallet = booking_status.get("tutorWallet", "")
        if tutor_wallet.lower() != user_id.lower():
            raise HTTPException(status_code=403, detail="Seul le tuteur peut accepter cet échange")
        
        # Confirmer la réservation (sans déblocage d'argent car montant = 0)
        result = blockchain_manager.confirm_booking(bookingId)
        
        logger.info(f"[ACCEPT_SKILL_EXCHANGE] Exchange accepted: {bookingId}")
        
        return {
            "success": True,
            "data": {
                "bookingId": bookingId,
                "status": "confirmed",
                "transactionHash": result.get("transactionHash")
            },
            "message": "Échange de compétences accepté avec succès"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ACCEPT_SKILL_EXCHANGE] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bookings/skill-exchange")
async def get_skill_exchange_bookings(
    user_id: str = Depends(get_current_user),
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Récupérer toutes les réservations d'échange de compétences pour l'utilisateur"""
    try:
        logger.info(f"[GET_SKILL_EXCHANGE_BOOKINGS] User: {user_id}, Status filter: {status}")
        
        # Récupérer toutes les réservations de l'utilisateur
        all_bookings = blockchain_manager.get_user_bookings(user_id)
        
        # Filtrer pour ne garder que les échanges de compétences (amount = 0)
        skill_exchange_bookings = [
            booking for booking in all_bookings 
            if booking.get("amount", -1) == 0
        ]
        
        # Filtrer par statut si demandé
        if status:
            skill_exchange_bookings = [
                booking for booking in skill_exchange_bookings
                if booking.get("status", "").lower() == status.lower()
            ]
        
        logger.info(f"[GET_SKILL_EXCHANGE_BOOKINGS] Found {len(skill_exchange_bookings)} exchanges")
        
        return {
            "success": True,
            "data": skill_exchange_bookings,
            "count": len(skill_exchange_bookings)
        }
        
    except Exception as e:
        logger.error(f"[GET_SKILL_EXCHANGE_BOOKINGS] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
