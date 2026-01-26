from fastapi import APIRouter, HTTPException, Query, Header, Depends
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
import uuid
import requests
import logging
import jwt

from .blockchain import blockchain_manager
from .models import CreateBookingData, Booking, BookingStats

router = APIRouter()
logger = logging.getLogger(__name__)

# Fonction pour extraire l'utilisateur du token JWT
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
            return "d755226e-bb7b-4bec-9af0-e578da8362dc"
        
        return str(user_id)
    except Exception as e:
        logger.warning(f"Erreur décoding token: {e}, utilisant user par défaut")
        return "d755226e-bb7b-4bec-9af0-e578da8362dc"

# Pas de stockage local - tout est sur la blockchain

async def verify_user_and_get_role(user_id: str, authorization: Optional[str] = None) -> Tuple[str, str]:
    """Vérifier un utilisateur et renvoyer (user_id, role).

    - Essaye d'abord l'ID comme user.id
    - Si 404, tente de le résoudre comme ProfileTutor.id ou ProfileStudent.id
    """
    headers = {"Authorization": authorization} if authorization else {}

    try:
        user_resp = requests.get(
            f"{blockchain_manager.auth_service_url}/api/users/{user_id}",
            headers=headers,
            timeout=5
        )

        if user_resp.status_code == 200:
            user_data = user_resp.json().get("data", {})
            return str(user_data.get("id", user_id)), user_data.get("role", "student")

        # Si non trouvé, tenter comme profil tuteur
        profile_tutor_resp = requests.get(
            f"{blockchain_manager.auth_service_url}/api/profile/tutors/{user_id}",
            headers=headers,
            timeout=5
        )
        if profile_tutor_resp.status_code == 200:
            tutor_data = profile_tutor_resp.json().get("data", {})
            tutor_user = tutor_data.get("user", {})
            resolved_id = tutor_user.get("id") or tutor_data.get("userId")
            if resolved_id:
                return str(resolved_id), tutor_user.get("role", "tutor")

        # Si non trouvé, tenter comme profil étudiant
        profile_student_resp = requests.get(
            f"{blockchain_manager.auth_service_url}/api/profile/students/{user_id}",
            headers=headers,
            timeout=5
        )
        if profile_student_resp.status_code == 200:
            student_data = profile_student_resp.json().get("data", {})
            student_user = student_data.get("user", {})
            resolved_id = student_user.get("id") or student_data.get("userId")
            if resolved_id:
                return str(resolved_id), student_user.get("role", "student")

        raise HTTPException(status_code=404, detail="Utilisateur non trouvé (ID utilisateur ou profil)")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur vérification utilisateur: {str(e)}")

@router.post("/booking")
async def create_booking(
    booking_data: CreateBookingData,
    student_user_id: str = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Créer une réservation - Argent en escrow jusqu'à confirmation"""
    print(f"\n{'='*80}")
    print("[CREATE_BOOKING] Nouvelle réservation demandée")
    print(f"{'='*80}\n")
    try:
        logger.info(f"[CREATE_BOOKING] Début - Student: {student_user_id}, Tutor: {booking_data.tutorId}")
        
        # Vérifier que les utilisateurs existent
        logger.info(f"[CREATE_BOOKING] Vérification étudiant: {student_user_id}")
        student_user_id, student_role = await verify_user_and_get_role(student_user_id, authorization)
        
        logger.info(f"[CREATE_BOOKING] Vérification tuteur: {booking_data.tutorId}")
        tutor_user_id, tutor_role = await verify_user_and_get_role(booking_data.tutorId, authorization)
        
        logger.info(f"[CREATE_BOOKING] Utilisateurs vérifiés OK (student role={student_role}, tutor role={tutor_role})")
        
        # Convertir la date/heure en timestamp
        logger.info(f"[CREATE_BOOKING] Conversion date/heure: {booking_data.date}T{booking_data.time}:00")
        start_datetime = datetime.fromisoformat(f"{booking_data.date}T{booking_data.time}:00")
        start_timestamp = int(start_datetime.timestamp())
        
        # Générer un ID frontend unique
        frontend_booking_id = str(uuid.uuid4())
        logger.info(f"[CREATE_BOOKING] Frontend ID généré: {frontend_booking_id}")
        
        # Récupérer le titre de l'annonce pour enrichir la description
        course_title = "Session de tutorat"
        if booking_data.annonceId:
            try:
                # Essayer de récupérer l'annonce
                annonce_resp = requests.get(
                    f"{blockchain_manager.auth_service_url}/api/annonces/{booking_data.annonceId}",
                    headers={"Authorization": authorization} if authorization else {},
                    timeout=5
                )
                logger.info(f"[CREATE_BOOKING] Réponse annonce: status={annonce_resp.status_code}")
                
                if annonce_resp.status_code == 200:
                    annonce_full = annonce_resp.json()
                    annonce_data = annonce_full.get("data", {})
                    
                    # Utiliser le titre de l'annonce ou construire un titre personnalisé
                    if annonce_data.get("title"):
                        course_title = annonce_data.get("title")
                        logger.info(f"[CREATE_BOOKING] Titre trouvé: {course_title}")
                    elif annonce_data.get("subject"):
                        course_title = f"Cours de {annonce_data.get('subject')}"
                        logger.info(f"[CREATE_BOOKING] Titre construit depuis subject: {course_title}")
                else:
                    logger.warning(f"[CREATE_BOOKING] Annonce non trouvée (status={annonce_resp.status_code})")
            except Exception as e:
                logger.warning(f"[CREATE_BOOKING] Impossible de récupérer l'annonce {booking_data.annonceId}: {e}")
        
        # Fallback final si course_title est toujours vide
        if not course_title or course_title == "Session de tutorat":
            course_title = booking_data.description or "Session de tutorat"
        
        logger.info(f"[CREATE_BOOKING] Course title final: {course_title}")
        
        # Créer la réservation sur la blockchain
        logger.info(f"[CREATE_BOOKING] Appel blockchain.create_booking...")
        blockchain_result = blockchain_manager.create_booking(
            student_user_id=student_user_id,
            tutor_user_id=tutor_user_id,
            amount=booking_data.amount,
            start_timestamp=start_timestamp,
            duration=booking_data.duration or 60,
            description=course_title,
            frontend_booking_id=frontend_booking_id
        )
        
        logger.info(f"[CREATE_BOOKING] Blockchain OK - ID: {blockchain_result.get('booking_id')}")
        
        # Récupérer le statut depuis la blockchain
        logger.info(f"[CREATE_BOOKING] Récupération du statut...")
        booking_status = blockchain_manager.get_booking_status(blockchain_result["booking_id"])
        
        logger.info(f"[CREATE_BOOKING] Statut récupéré: {booking_status.get('status')}")
        
        # Construire la réponse pour le frontend
        booking = Booking(
            id=frontend_booking_id,
            tutorId=tutor_user_id,
            studentId=student_user_id,
            annonceId=booking_data.annonceId,
            date=booking_data.date,
            time=booking_data.time,
            duration=booking_data.duration or 60,
            status=booking_status["status"],
            amount=booking_data.amount,
            transactionHash=blockchain_result["transaction_hash"],
            blockchainStatus=booking_status["status"],
            blockchainTransactionId=str(blockchain_result["booking_id"]),
            description=course_title,
            studentNotes=booking_data.studentNotes,
            createdAt=datetime.fromtimestamp(booking_status["created_at"]).isoformat(),
            updatedAt=datetime.fromtimestamp(booking_status["created_at"]).isoformat()
        )
        
        return {
            "success": True,
            "message": "Réservation créée avec succès - Argent en attente de confirmation du tuteur",
            "data": booking.dict()
        }
        
    except ValueError as e:
        print(f"\n[CREATE_BOOKING] ValueError: {str(e)}\n")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as http_exc:
        print(f"\n[CREATE_BOOKING] HTTPException: {http_exc.status_code} - {http_exc.detail}\n")
        raise
    except Exception as e:
        import traceback
        print(f"\n{'='*80}")
        print("[CREATE_BOOKING] EXCEPTION CRITIQUE:")
        print(f"Type: {type(e).__name__}")
        print(f"Message: {str(e)}")
        print("Traceback:")
        traceback.print_exc()
        print(f"{'='*80}\n")
        raise HTTPException(status_code=500, detail=f"Erreur création réservation: {str(e)}")

@router.patch("/booking/{id}/confirm")
async def confirm_booking(
    id: str,
    tutor_user_id: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """Confirmer une réservation (tutor) - L'argent reste en attente jusqu'après la date du cours"""
    try:
        # Récupérer l'ID blockchain depuis l'ID frontend
        try:
            booking_id = blockchain_manager.escrow_contract.functions.getBookingByFrontendId(
                blockchain_manager.uuid_to_bytes32(id)
            ).call()
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Réservation non trouvée: {str(e)}")
        
        # Confirmer sur la blockchain
        blockchain_result = blockchain_manager.confirm_booking(booking_id, tutor_user_id)
        
        # Récupérer le statut mis à jour
        booking_status = blockchain_manager.get_booking_status(booking_id)
        
        return {
            "success": True,
            "message": "Réservation confirmée par le tuteur - L'argent sera transféré après le cours et confirmation mutuelle",
            "data": {
                "id": id,
                "blockchainId": booking_id,
                "status": booking_status["status"],
                "studentConfirmed": booking_status["student_confirmed"],
                "tutorConfirmed": booking_status["tutor_confirmed"],
                "blockchain": blockchain_result
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur confirmation réservation: {str(e)}")

@router.patch("/booking/{id}/cancel")
async def cancel_booking(
    id: str,
    tutor_user_id: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """Annuler une réservation (tuteur) - Remboursement immédiat de l'étudiant"""
    try:
        # Récupérer l'ID blockchain
        try:
            booking_id = blockchain_manager.escrow_contract.functions.getBookingByFrontendId(
                blockchain_manager.uuid_to_bytes32(id)
            ).call()
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Réservation non trouvée: {str(e)}")
        
        # Rejeter sur la blockchain (remboursement automatique)
        blockchain_result = blockchain_manager.reject_booking(booking_id, tutor_user_id)
        
        # Récupérer le statut mis à jour
        booking_status = blockchain_manager.get_booking_status(booking_id)
        
        return {
            "success": True,
            "message": "Réservation annulée - L'étudiant a été remboursé",
            "data": {
                "id": id,
                "blockchainId": booking_id,
                "status": booking_status["status"],
                "amount": booking_status["amount"],
                "blockchain": blockchain_result
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur annulation réservation: {str(e)}")

@router.patch("/booking/{id}/complete")
async def complete_booking(id: str) -> Dict[str, Any]:
    """Marquer une réservation comme complétée"""
    try:
        # Dans notre logique on-chain, la complétion nécessite la confirmation des deux parties
        # Cette route est pour la compatibilité avec le frontend existant
        return {
            "success": True,
            "message": "Pour compléter une réservation, utilisez /confirm-outcome",
            "data": {"id": id, "status": "INFO"}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@router.post("/booking/{id}/confirm-outcome")
async def confirm_booking_outcome(
    id: str,
    course_held: bool,
    user_id: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Confirmer si un cours a eu lieu ou non (après la date du cours)
    
    Logique:
    - Si BOTH confirment course_held=True -> argent transféré au tuteur
    - Si BOTH confirment course_held=False -> argent remboursé à l'étudiant
    - Si DÉSACCORD -> dispute resolution (après 7 jours)
    """
    try:
        # Récupérer l'ID blockchain
        try:
            booking_id = blockchain_manager.escrow_contract.functions.getBookingByFrontendId(
                blockchain_manager.uuid_to_bytes32(id)
            ).call()
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Réservation non trouvée: {str(e)}")
        
        # Vérifier que le cours a commencé
        booking_status = blockchain_manager.get_booking_status(booking_id)
        current_time = datetime.now().timestamp()
        
        if current_time < booking_status["start_time"]:
            raise HTTPException(
                status_code=400,
                detail=f"Le cours n'a pas encore commencé (commence le {datetime.fromtimestamp(booking_status['start_time']).isoformat()})"
            )
        
        # Confirmer l'issue sur la blockchain
        blockchain_result = blockchain_manager.confirm_course_outcome(
            booking_id,
            user_id,
            course_held
        )
        
        # Récupérer le statut mis à jour
        updated_status = blockchain_manager.get_booking_status(booking_id)
        
        # Déterminer le message basé sur le nouvel état
        if updated_status["status"] == "COMPLETED":
            message = "✅ Cours confirmé - L'argent a été transféré au tuteur"
        elif updated_status["status"] == "CANCELLED":
            message = "❌ Cours annulé - L'étudiant a été remboursé"
        else:
            message = f"Confirmation enregistrée - En attente de la confirmation de l'autre partie ({1 if not updated_status['student_confirmed'] else 1} confirmation manquante)"
        
        return {
            "success": True,
            "message": message,
            "data": {
                "id": id,
                "blockchainId": booking_id,
                "status": updated_status["status"],
                "outcome": updated_status["outcome"],
                "studentConfirmed": updated_status["student_confirmed"],
                "tutorConfirmed": updated_status["tutor_confirmed"],
                "amount": updated_status["amount"],
                "blockchain": blockchain_result
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur confirmation issue: {str(e)}")

@router.get("/booking/user/{userId}")
async def get_bookings_by_user(
    userId: str,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """Obtenir les réservations d'un utilisateur"""
    try:
        # Vérifier que l'utilisateur existe
        await verify_user_and_get_role(userId)
        
        # Dans une vraie implémentation, vous devriez indexer les événements
        # Pour la démo, nous retournons une liste vide
        return {
            "success": True,
            "data": []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur récupération réservations: {str(e)}")

@router.get("/booking/{id}")
async def get_booking_details(id: str) -> Dict[str, Any]:
    """Obtenir les détails d'une réservation"""
    try:
        # Récupérer l'ID blockchain depuis l'ID frontend
        try:
            booking_id = blockchain_manager.escrow_contract.functions.getBookingByFrontendId(
                blockchain_manager.uuid_to_bytes32(id)
            ).call()
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Réservation non trouvée: {str(e)}")
        
        # Récupérer depuis la blockchain
        booking_status = blockchain_manager.get_booking_status(booking_id)
        
        # Déterminer les actions possibles basées sur le statut
        current_time = datetime.now().timestamp()
        can_confirm_outcome = (
            booking_status["status"] == "CONFIRMED" and 
            current_time >= booking_status["start_time"]
        )
        
        # Construire la réponse
        booking_data = {
            "id": id,
            "blockchainId": booking_id,
            "status": booking_status["status"],
            "outcome": booking_status["outcome"],
            "student": booking_status["student"],
            "tutor": booking_status["tutor"],
            "amount": booking_status["amount"],
            "startTime": booking_status["start_time"],
            "duration": booking_status["duration"],
            "description": booking_status["description"],
            "studentConfirmed": booking_status["student_confirmed"],
            "tutorConfirmed": booking_status["tutor_confirmed"],
            "createdAt": booking_status["created_at"],
            "canConfirmOutcome": can_confirm_outcome,
            "canCancel": booking_status["status"] == "PENDING" or booking_status["status"] == "CONFIRMED"
        }
        
        return {
            "success": True,
            "message": "Détails de la réservation récupérés",
            "data": booking_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur récupération détails: {str(e)}")


@router.get("/booking/tutor/{tutorId}")
async def get_bookings_by_tutor(
    tutorId: str,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """Obtenir les réservations d'un tuteur"""
    try:
        # Vérifier que le tuteur existe
        await verify_user_and_get_role(tutorId)
        
        # Dans une vraie implémentation, vous devriez indexer les événements blockchain
        # Pour la démo, nous retournons une liste vide
        return {
            "success": True,
            "message": "Réservations du tuteur récupérées",
            "data": []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur récupération réservations tuteur: {str(e)}")


@router.get("/booking/{userId}/stats")
async def get_booking_stats(userId: str) -> Dict[str, Any]:
    """Obtenir les statistiques de réservation d'un utilisateur"""
    try:
        # Vérifier que l'utilisateur existe
        await verify_user_and_get_role(userId)
        
        # Dans une vraie implémentation, vous calculerez depuis la blockchain
        # Pour la démo, nous retournons des stats vides
        return {
            "success": True,
            "message": "Statistiques récupérées",
            "data": {
                "total": 0,
                "pending": 0,
                "confirmed": 0,
                "cancelled": 0,
                "completed": 0,
                "totalAmount": 0,
                "pendingAmount": 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur récupération statistiques: {str(e)}")