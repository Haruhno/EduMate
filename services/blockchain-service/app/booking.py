from fastapi import APIRouter, HTTPException, Query, Header, Depends
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
import uuid
import requests
import logging
import jwt
import traceback

from .blockchain import blockchain_manager
from .models import CreateBookingData, Booking, BookingStats, CreateBatchBookingData

router = APIRouter()
logger = logging.getLogger(__name__)

# ⚡ Mapping en mémoire pour stocker annonceId par frontend_id
# Format: {frontend_id: annonceId}
BOOKING_ANNONCE_MAP: Dict[str, str] = {}
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

async def get_user_by_wallet(wallet_address: str, authorization: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrouver un utilisateur par son adresse wallet"""
    try:
        headers = {"Authorization": authorization} if authorization else {}
        
        # Essayer d'abord via blockchain pour retrouver l'userId
        try:
            wallet_info = blockchain_manager._get_wallet_info_sync(wallet_address)
            if wallet_info and wallet_info.get("id"):
                user_id = wallet_info.get("id")
                
                # Récupérer les infos complètes de l'user
                resp = requests.get(
                    f"{blockchain_manager.auth_service_url}/api/users/{user_id}",
                    headers=headers,
                    timeout=5
                )
                
                if resp.status_code == 200:
                    return resp.json().get("data")
        except Exception as e:
            logger.debug(f"Erreur wallet_info sync pour {wallet_address}: {e}")
        
        # Fallback: appeler l'auth-service directement (si endpoint existe)
        try:
            resp = requests.get(
                f"{blockchain_manager.auth_service_url}/api/users/wallet/{wallet_address}",
                headers=headers,
                timeout=5
            )
            
            if resp.status_code == 200:
                return resp.json().get("data")
        except:
            pass
        
        return None
    except Exception as e:
        logger.warning(f"Erreur retrouver user par wallet {wallet_address}: {e}")
        return None

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
        
        # ⚡ Stocker le mapping frontend_id → annonceId
        if booking_data.annonceId:
            BOOKING_ANNONCE_MAP[frontend_booking_id] = booking_data.annonceId
            logger.info(f"[CREATE_BOOKING] Mapping sauvegardé: {frontend_booking_id} → {booking_data.annonceId}")
        
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
        print(f"\n{'='*80}")
        print("[CREATE_BOOKING] EXCEPTION CRITIQUE:")
        print(f"Type: {type(e).__name__}")
        print(f"Message: {str(e)}")
        print("Traceback:")
        traceback.print_exc()
        print(f"{'='*80}\n")
        raise HTTPException(status_code=500, detail=f"Erreur création réservation: {str(e)}")

@router.post("/booking/batch")
async def create_batch_bookings(
    batch_data: CreateBatchBookingData,
    student_user_id: str = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Créer plusieurs réservations en une seule requête
    
    Chaque réservation est créée mais avec une logique optimisée:
    - Les verifications utilisateur sont faites une seule fois
    - Les montants sont validés ensemble
    - Les approbations sont consolidées si possible
    """
    print(f"\n{'='*80}")
    print(f"[CREATE_BATCH_BOOKING] Nouvelles {len(batch_data.bookings)} réservations demandées")
    print(f"{'='*80}\n")
    
    try:
        logger.info(f"[CREATE_BATCH_BOOKING] Début - Student: {student_user_id}, Tutor: {batch_data.tutorId}, Nombre: {len(batch_data.bookings)}")
        
        if len(batch_data.bookings) == 0:
            raise ValueError("Au moins une réservation doit être fournie")
        
        # Vérifier que les utilisateurs existent (UNE SEULE FOIS)
        logger.info(f"[CREATE_BATCH_BOOKING] Vérification étudiant: {student_user_id}")
        student_user_id, student_role = await verify_user_and_get_role(student_user_id, authorization)
        
        logger.info(f"[CREATE_BATCH_BOOKING] Vérification tuteur: {batch_data.tutorId}")
        tutor_user_id, tutor_role = await verify_user_and_get_role(batch_data.tutorId, authorization)
        
        logger.info(f"[CREATE_BATCH_BOOKING] Utilisateurs vérifiés OK (student role={student_role}, tutor role={tutor_role})")
        
        # Calculer le montant total
        total_amount = sum(booking["amount"] for booking in batch_data.bookings)
        logger.info(f"[CREATE_BATCH_BOOKING] Montant total: {total_amount} EDU pour {len(batch_data.bookings)} réservations")
        
        # Récupérer le titre de l'annonce UNE SEULE FOIS
        course_title = batch_data.description or "Session de tutorat"
        try:
            annonce_resp = requests.get(
                f"{blockchain_manager.auth_service_url}/api/annonces/{batch_data.annonceId}",
                headers={"Authorization": authorization} if authorization else {},
                timeout=5
            )
            if annonce_resp.status_code == 200:
                annonce_data = annonce_resp.json().get("data", {})
                course_title = annonce_data.get("title", batch_data.description or "Session de tutorat")
                logger.info(f"[CREATE_BATCH_BOOKING] Titre annonce trouvé: {course_title}")
        except Exception as e:
            logger.warning(f"[CREATE_BATCH_BOOKING] Impossible de récupérer l'annonce: {e}")
        
        # Créer toutes les réservations en boucle
        results = []
        failed_bookings = []
        
        for idx, booking_slot in enumerate(batch_data.bookings):
            logger.info(f"[CREATE_BATCH_BOOKING] Création réservation {idx+1}/{len(batch_data.bookings)}")
            logger.info(f"[CREATE_BATCH_BOOKING] Slot: date={booking_slot.get('date')}, time={booking_slot.get('time')}, amount={booking_slot.get('amount')}, duration={booking_slot.get('duration')}")
            
            try:
                # Convertir la date/heure en timestamp
                slot_date = booking_slot.get('date')
                slot_time = booking_slot.get('time')
                if not slot_date or not slot_time:
                    raise ValueError(f"Date ou heure manquante: date={slot_date}, time={slot_time}")
                
                start_datetime = datetime.fromisoformat(f"{slot_date}T{slot_time}:00")
                start_timestamp = int(start_datetime.timestamp())
                
                # Générer un ID frontend unique
                frontend_booking_id = str(uuid.uuid4())
                logger.info(f"[CREATE_BATCH_BOOKING] Frontend ID: {frontend_booking_id}")
                
                # Créer la réservation
                logger.info(f"[CREATE_BATCH_BOOKING] Appel blockchain.create_booking (slot {idx+1})")
                blockchain_result = blockchain_manager.create_booking(
                    student_user_id=student_user_id,
                    tutor_user_id=tutor_user_id,
                    amount=booking_slot['amount'],
                    start_timestamp=start_timestamp,
                    duration=booking_slot.get('duration', 60),
                    description=course_title,
                    frontend_booking_id=frontend_booking_id
                )
                
                logger.info(f"[CREATE_BATCH_BOOKING] Blockchain result: booking_id={blockchain_result.get('booking_id')}")
                
                # Récupérer le statut
                booking_status = blockchain_manager.get_booking_status(blockchain_result["booking_id"])
                logger.info(f"[CREATE_BATCH_BOOKING] Booking status: {booking_status.get('status')}")
                
                # Construire la réponse pour ce slot
                booking = Booking(
                    id=frontend_booking_id,
                    tutorId=tutor_user_id,
                    studentId=student_user_id,
                    annonceId=batch_data.annonceId,
                    date=booking_slot['date'],
                    time=booking_slot['time'],
                    duration=booking_slot.get('duration', 60),
                    status=booking_status["status"],
                    amount=booking_slot['amount'],
                    transactionHash=blockchain_result.get("transaction_hash", ""),
                    blockchainStatus=booking_status["status"],
                    blockchainTransactionId=str(blockchain_result.get("booking_id", "")),
                    description=course_title,
                    studentNotes=batch_data.studentNotes,
                    createdAt=datetime.fromtimestamp(booking_status.get("created_at", int(datetime.now().timestamp()))).isoformat(),
                    updatedAt=datetime.fromtimestamp(booking_status.get("created_at", int(datetime.now().timestamp()))).isoformat()
                )
                
                results.append(booking.dict())
                logger.info(f"[CREATE_BATCH_BOOKING] ✅ Réservation {idx+1} créée avec succès")
                
            except Exception as e:
                logger.error(f"[CREATE_BATCH_BOOKING] ❌ Erreur réservation {idx+1}: {type(e).__name__}: {str(e)}", exc_info=True)
                failed_bookings.append({
                    "index": idx+1,
                    "slot": {k: v for k, v in booking_slot.items() if k in ['date', 'time', 'amount', 'duration']},
                    "error": str(e)
                })
        
        # Déterminer le statut global
        success = len(results) > 0
        message = f"{len(results)} réservation(s) créée(s) avec succès"
        
        if failed_bookings:
            message += f" ({len(failed_bookings)} échouée(s))"
            logger.warning(f"[CREATE_BATCH_BOOKING] {len(failed_bookings)} réservations échouées: {failed_bookings}")
            for failure in failed_bookings:
                logger.warning(f"  - Slot {failure['index']}: {failure['error']}")
        
        message += " - Les réservations sont en attente de confirmation du tuteur"
        
        return {
            "success": success,
            "message": message,
            "data": {
                "bookings": results,
                "totalAmount": total_amount,
                "count": len(results),
                "failedCount": len(failed_bookings),
                "failures": failed_bookings if failed_bookings else None
            }
        }
        
    except ValueError as e:
        print(f"\n[CREATE_BATCH_BOOKING] ValueError: {str(e)}\n")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as http_exc:
        print(f"\n[CREATE_BATCH_BOOKING] HTTPException: {http_exc.status_code} - {http_exc.detail}\n")
        raise
    except Exception as e:
        print(f"\n{'='*80}")
        print("[CREATE_BATCH_BOOKING] EXCEPTION CRITIQUE:")
        print(f"Type: {type(e).__name__}")
        print(f"Message: {str(e)}")
        print("Traceback:")
        traceback.print_exc()
        print(f"{'='*80}\n")
        raise HTTPException(status_code=500, detail=f"Erreur création réservations batch: {str(e)}")



@router.patch("/booking/{id}/confirm")
async def confirm_booking(
    id: str,
    body: dict = None,
    tutor_user_id: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """Confirmer une réservation (tutor) - L'argent reste en attente jusqu'après la date du cours"""
    try:
        # Récupérer les notes si présentes
        tutor_notes = ""
        if body and isinstance(body, dict):
            tutor_notes = body.get("tutorNotes", "")
        
        # Récupérer l'ID blockchain depuis l'ID frontend
        try:
            booking_id = blockchain_manager.escrow_contract.functions.getBookingByFrontendId(
                blockchain_manager.uuid_to_bytes32(id)
            ).call()
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Réservation non trouvée: {str(e)}")
        
        # Bloquer la confirmation si la date du cours est depassee
        booking_status = blockchain_manager.get_booking_status(booking_id)
        current_time = datetime.now().timestamp()
        if current_time >= booking_status["start_time"]:
            raise HTTPException(
                status_code=400,
                detail="La date du cours est depassee, la confirmation n'est plus possible"
            )

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
    """Obtenir les réservations d'un étudiant depuis la blockchain"""
    try:
        logger.info(f"[GET_USER_BOOKINGS] Récupération des réservations pour étudiant: {userId}")
        
        # Vérifier que l'utilisateur existe
        await verify_user_and_get_role(userId)
        
        # Récupérer le wallet de l'étudiant
        user_wallet = blockchain_manager.get_user_wallet(userId)
        student_address = blockchain_manager.w3.to_checksum_address(user_wallet["address"])
        
        bookings = []
        
        try:
            # Récupérer le nombre total de réservations
            booking_count = blockchain_manager.escrow_contract.functions.getBookingCount().call()
            logger.info(f"[GET_USER_BOOKINGS] Total bookings in contract: {booking_count}")
            
            # Parcourir toutes les réservations et filtrer pour cet étudiant
            for booking_id in range(booking_count):
                try:
                    # Récupérer la réservation
                    booking_data = blockchain_manager.escrow_contract.functions.getBooking(booking_id).call()
                    
                    # Unpack les données
                    (
                        id_,
                        student,
                        tutor,
                        amount,
                        start_time,
                        duration,
                        status_,
                        outcome,
                        created_at,
                        student_confirmed,
                        tutor_confirmed,
                        description,
                        frontend_id
                    ) = booking_data
                    
                    # Vérifier si cet étudiant correspond
                    if blockchain_manager.w3.to_checksum_address(student) == student_address:
                        logger.info(f"[GET_USER_BOOKINGS] Booking {booking_id} is for this student")
                        
                        # Convertir le frontend_id en UUID
                        frontend_id_str = blockchain_manager.bytes32_to_uuid(frontend_id) or frontend_id.hex()
                        
                        # Mapper le statut
                        status_map = {0: "PENDING", 1: "CONFIRMED", 2: "CANCELLED", 3: "COMPLETED", 4: "DISPUTED"}
                        
                        booking_dict = {
                            "id": frontend_id_str,
                            "blockchainId": booking_id,
                            "studentAddress": student,
                            "tutorAddress": tutor,
                            "amount": float(blockchain_manager.w3.from_wei(amount, 'ether')),
                            "startTime": start_time,
                            "duration": duration,
                            "status": status_map.get(status_, "UNKNOWN"),
                            "outcome": outcome,
                            "createdAt": created_at,
                            "studentConfirmed": student_confirmed,
                            "tutorConfirmed": tutor_confirmed,
                            "description": description,
                            "frontendId": frontend_id_str
                        }
                        
                        # Essayer d'enrichir avec les infos du tuteur
                        try:
                            tutor_user = await get_user_by_wallet(tutor, None)
                            if tutor_user:
                                booking_dict["tutor"] = tutor_user
                        except Exception as e:
                            logger.debug(f"[GET_USER_BOOKINGS] Could not fetch tutor info: {e}")
                        
                        # Filtrer par statut si demandé
                        if status is None or booking_dict.get("status") == status:
                            bookings.append(booking_dict)
                        
                except Exception as e:
                    logger.debug(f"[GET_USER_BOOKINGS] Error reading booking {booking_id}: {e}")
                    continue
            
            logger.info(f"[GET_USER_BOOKINGS] Found {len(bookings)} bookings for student {userId}")
            
        except Exception as e:
            logger.error(f"[GET_USER_BOOKINGS] Error retrieving bookings: {e}", exc_info=True)
            raise
        
        return {
            "success": True,
            "message": "Réservations de l'étudiant récupérées",
            "data": bookings
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET_USER_BOOKINGS] Erreur récupération réservations étudiant: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur récupération réservations: {str(e)}")

@router.get("/booking/student-courses/{userId}")
async def get_student_courses(
    userId: str,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Obtenir les cours de l'étudiant (réservations acceptées par le tuteur - CONFIRMED ou COMPLETED)
    
    Cette page est pour l'Historique des Cours où l'étudiant voit ses cours acceptés
    et peut noter le tuteur après la session
    """
    try:
        logger.info(f"[GET_STUDENT_COURSES] Récupération des cours pour étudiant: {userId}")
        
        # Vérifier que l'utilisateur existe
        await verify_user_and_get_role(userId)
        
        # Récupérer le wallet de l'étudiant
        user_wallet = blockchain_manager.get_user_wallet(userId)
        student_address = blockchain_manager.w3.to_checksum_address(user_wallet["address"])
        
        courses = []
        
        try:
            # Récupérer le nombre total de réservations
            booking_count = blockchain_manager.escrow_contract.functions.getBookingCount().call()
            logger.info(f"[GET_STUDENT_COURSES] Total bookings in contract: {booking_count}")
            
            # Parcourir toutes les réservations et filtrer pour cet étudiant
            for booking_id in range(booking_count):
                try:
                    # Récupérer la réservation
                    booking_data = blockchain_manager.escrow_contract.functions.getBooking(booking_id).call()
                    
                    # Unpack les données
                    (
                        id_,
                        student,
                        tutor,
                        amount,
                        start_time,
                        duration,
                        status_,
                        outcome,
                        created_at,
                        student_confirmed,
                        tutor_confirmed,
                        description,
                        frontend_id
                    ) = booking_data
                    
                    # Vérifier si cet étudiant correspond
                    if blockchain_manager.w3.to_checksum_address(student) == student_address:
                        # Mapper le statut
                        status_map = {0: "PENDING", 1: "CONFIRMED", 2: "CANCELLED", 3: "COMPLETED", 4: "DISPUTED"}
                        booking_status = status_map.get(status_, "UNKNOWN")
                        
                        # Filtrer uniquement les cours acceptés (CONFIRMED) ou terminés (COMPLETED)
                        if booking_status not in ["CONFIRMED", "COMPLETED"]:
                            continue
                        
                        # Convertir le frontend_id en UUID
                        frontend_id_str = blockchain_manager.bytes32_to_uuid(frontend_id) or frontend_id.hex()
                        
                        # Récupérer les infos du tuteur
                        tutor_user = None
                        tutor_user_id = None
                        try:
                            tutor_user_id_bytes = blockchain_manager.token_contract.functions.getUserId(tutor).call()
                            tutor_user_id = blockchain_manager.bytes32_to_uuid(tutor_user_id_bytes)
                            
                            if tutor_user_id:
                                tutor_resp = requests.get(
                                    f"{blockchain_manager.auth_service_url}/api/users/{tutor_user_id}",
                                    timeout=5
                                )
                                if tutor_resp.status_code == 200:
                                    tutor_user = tutor_resp.json().get("data", {})
                        except Exception as e:
                            logger.warning(f"[GET_STUDENT_COURSES] Erreur récupération tuteur: {e}")
                        
                        # Récupérer les infos de l'annonce
                        annonce_info = None
                        # ⚡ Récupérer l'annonceId depuis le mapping
                        annonce_id = BOOKING_ANNONCE_MAP.get(frontend_id_str)
                        
                        if annonce_id and tutor_user_id:
                            try:
                                # Récupérer l'annonce spécifique par ID
                                annonce_resp = requests.get(
                                    f"{blockchain_manager.auth_service_url}/api/annonces/{annonce_id}",
                                    timeout=5
                                )
                                if annonce_resp.status_code == 200:
                                    annonce_data = annonce_resp.json().get("data", {})
                                    if annonce_data:
                                        annonce_info = {
                                            "id": annonce_data.get("id"),
                                            "title": annonce_data.get("title"),
                                            "subject": annonce_data.get("subject"),
                                            "description": annonce_data.get("description"),
                                            "level": annonce_data.get("level"),
                                            "teachingMode": annonce_data.get("teachingMode")
                                        }
                            except Exception as e:
                                logger.warning(f"[GET_STUDENT_COURSES] Erreur récupération annonce: {e}")
                                # Fallback: chercher une annonce du tuteur si le mapping échoue
                                try:
                                    annonce_resp = requests.get(
                                        f"{blockchain_manager.auth_service_url}/api/annonces?tutorId={tutor_user_id}",
                                        timeout=5
                                    )
                                    if annonce_resp.status_code == 200:
                                        annonces_data = annonce_resp.json().get("data", [])
                                        if isinstance(annonces_data, list) and len(annonces_data) > 0:
                                            first_annonce = annonces_data[0]
                                            annonce_info = {
                                                "id": first_annonce.get("id"),
                                                "title": first_annonce.get("title"),
                                                "subject": first_annonce.get("subject"),
                                                "description": first_annonce.get("description"),
                                                "level": first_annonce.get("level"),
                                                "teachingMode": first_annonce.get("teachingMode")
                                            }
                                except Exception as e2:
                                    logger.warning(f"[GET_STUDENT_COURSES] Fallback annonce échoué: {e2}")
                        
                        # Déterminer si le cours est passé
                        current_time = datetime.now().timestamp()
                        course_passed = current_time >= start_time
                        
                        course_dict = {
                            "id": frontend_id_str,
                            "blockchainId": booking_id,
                            "studentAddress": student,
                            "tutorAddress": tutor,
                            "tutorId": tutor_user.get("id") if tutor_user else None,
                            "tutor": tutor_user,
                            "amount": float(blockchain_manager.w3.from_wei(amount, 'ether')),
                            "startTime": start_time,
                            "duration": duration,
                            "status": booking_status,
                            "createdAt": created_at,
                            "studentConfirmed": student_confirmed,
                            "tutorConfirmed": tutor_confirmed,
                            "description": description,
                            "annonce": annonce_info,
                            "coursePassed": course_passed,
                            "frontendId": frontend_id_str
                        }
                        
                        courses.append(course_dict)
                        
                except Exception as e:
                    logger.debug(f"[GET_STUDENT_COURSES] Error reading booking {booking_id}: {e}")
                    continue
            
            logger.info(f"[GET_STUDENT_COURSES] Found {len(courses)} courses for student {userId}")
            
        except Exception as e:
            logger.error(f"[GET_STUDENT_COURSES] Error retrieving courses: {e}", exc_info=True)
            raise
        
        return {
            "success": True,
            "message": "Cours de l'étudiant récupérés",
            "data": courses
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET_STUDENT_COURSES] Erreur récupération cours étudiant: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur récupération cours: {str(e)}")

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
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Obtenir les réservations d'un tuteur depuis la blockchain"""
    try:
        logger.info(f"[GET_TUTOR_BOOKINGS] Récupération des réservations pour tuteur: {tutorId}")
        
        # Vérifier que le tuteur existe
        await verify_user_and_get_role(tutorId)
        
        # Récupérer toutes les réservations du tuteur depuis la blockchain
        bookings = blockchain_manager.get_tutor_bookings(tutorId)
        
        # Enrichir les réservations avec les données utilisateurs et annonces
        enriched_bookings = []
        
        for booking in bookings:
            try:
                # Essayer de récupérer les infos de l'étudiant via son wallet
                student_info = None
                student_user = await get_user_by_wallet(booking.get('studentAddress'), authorization)
                
                if student_user:
                    student_info = student_user
                # Si pas trouvé, on laisse student_info comme None (graceful fallback)
                
                # Essayer de récupérer les infos de l'annonce
                annonce_info = None
                # ⚡ Récupérer l'annonceId depuis le mapping ou depuis le booking
                annonce_id = booking.get('annonceId') or BOOKING_ANNONCE_MAP.get(booking.get('id'))
                
                if annonce_id:
                    try:
                        annonce_resp = requests.get(
                            f"{blockchain_manager.auth_service_url}/api/annonces/{annonce_id}",
                            timeout=5
                        )
                        if annonce_resp.status_code == 200:
                            annonce_data = annonce_resp.json().get("data")
                            if annonce_data:
                                # Extraire TOUS les champs nécessaires de l'annonce
                                annonce_info = {
                                    "id": annonce_data.get("id"),
                                    "title": annonce_data.get("title"),  # Le vrai titre
                                    "subject": annonce_data.get("subject"),
                                    "description": annonce_data.get("description"),  # La vraie description
                                    "level": annonce_data.get("level"),
                                    "teachingMode": annonce_data.get("teachingMode")
                                }
                    except:
                        # Essayer avec tutorId
                        try:
                            annonce_resp = requests.get(
                                f"{blockchain_manager.auth_service_url}/api/annonces?tutorId={tutorId}",
                                timeout=5
                            )
                            if annonce_resp.status_code == 200:
                                annonces = annonce_resp.json().get("data", [])
                                # Chercher l'annonce par ID dans les réservations
                                for ann in annonces:
                                    if ann.get("id") == annonce_id:
                                        annonce_info = {
                                            "id": ann.get("id"),
                                            "title": ann.get("title"),
                                            "subject": ann.get("subject"),
                                            "description": ann.get("description")
                                        }
                                        break
                        except:
                            pass
                
                # Enrichir la réservation
                booking_enriched = {
                    **booking,
                    "student": student_info,
                    "annonce": annonce_info,
                    "annonceId": annonce_id
                }
                
                # Filtrer par statut si demandé
                if status is None or booking_enriched.get("status") == status:
                    enriched_bookings.append(booking_enriched)
                    
            except Exception as e:
                logger.warning(f"[GET_TUTOR_BOOKINGS] Erreur enrichissement réservation {booking.get('id')}: {e}")
                # Ajouter quand même la réservation sans enrichissement
                enriched_bookings.append(booking)
        
        logger.info(f"[GET_TUTOR_BOOKINGS] {len(enriched_bookings)} réservations retournées")
        
        return {
            "success": True,
            "message": "Réservations du tuteur récupérées",
            "data": enriched_bookings
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET_TUTOR_BOOKINGS] Erreur récupération réservations tuteur: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur récupération réservations tuteur: {str(e)}")


@router.get("/booking/student/{studentId}")
async def get_bookings_by_student(
    studentId: str,
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Obtenir les réservations d'un étudiant depuis la blockchain"""
    try:
        logger.info(f"[GET_STUDENT_BOOKINGS] Récupération des réservations pour étudiant: {studentId}")
        
        # Vérifier que l'étudiant existe
        await verify_user_and_get_role(studentId)
        
        # Récupérer toutes les réservations de l'étudiant depuis la blockchain
        bookings = blockchain_manager.get_student_bookings(studentId)
        
        # Enrichir les réservations avec les données tuteur et annonces
        enriched_bookings = []
        
        for booking in bookings:
            try:
                # Essayer de récupérer les infos du tuteur
                tutor_info = None
                tutor_user = await get_user_by_wallet(booking.get('tutorAddress'), authorization)
                
                if tutor_user:
                    tutor_info = tutor_user
                
                # Essayer de récupérer les infos de l'annonce
                annonce_info = None
                # ⚡ Récupérer l'annonceId depuis le mapping
                annonce_id = BOOKING_ANNONCE_MAP.get(booking.get('id'))
                
                if annonce_id:
                    try:
                        annonce_resp = requests.get(
                            f"{blockchain_manager.auth_service_url}/api/annonces/{annonce_id}",
                            timeout=5
                        )
                        if annonce_resp.status_code == 200:
                            annonce_data = annonce_resp.json().get("data")
                            if annonce_data:
                                annonce_info = {
                                    "id": annonce_data.get("id"),
                                    "title": annonce_data.get("title"),
                                    "subject": annonce_data.get("subject"),
                                    "description": annonce_data.get("description"),
                                    "level": annonce_data.get("level"),
                                    "teachingMode": annonce_data.get("teachingMode")
                                }
                    except:
                        pass
                
                # Enrichir la réservation
                booking_enriched = {
                    **booking,
                    "tutor": tutor_info,
                    "annonce": annonce_info,
                    "annonceId": annonce_id
                }
                
                # Filtrer par statut si demandé
                if status is None or booking_enriched.get("status") == status:
                    enriched_bookings.append(booking_enriched)
                    
            except Exception as e:
                logger.warning(f"[GET_STUDENT_BOOKINGS] Erreur enrichissement réservation {booking.get('id')}: {e}")
                # Ajouter quand même la réservation sans enrichissement
                enriched_bookings.append(booking)
        
        logger.info(f"[GET_STUDENT_BOOKINGS] {len(enriched_bookings)} réservations retournées")
        
        return {
            "success": True,
            "message": "Réservations de l'étudiant récupérées",
            "data": enriched_bookings
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET_STUDENT_BOOKINGS] Erreur récupération réservations étudiant: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur récupération réservations étudiant: {str(e)}")


@router.get("/booking/all/{userId}")
async def get_all_bookings_for_user(
    userId: str,
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Obtenir TOUTES les réservations d'un utilisateur (en tant que student ET tutor)
    Simplifie la logique: peu importe le rôle, on récupère tout
    """
    try:
        logger.info(f"[GET_ALL_BOOKINGS] Récupération pour user: {userId}")
        
        # Récupérer les bookings où l'utilisateur est STUDENT
        student_bookings = blockchain_manager.get_student_bookings(userId)
        logger.info(f"[GET_ALL_BOOKINGS] Found {len(student_bookings)} bookings as student")
        
        # Récupérer les bookings où l'utilisateur est TUTOR
        tutor_bookings = blockchain_manager.get_tutor_bookings(userId)
        logger.info(f"[GET_ALL_BOOKINGS] Found {len(tutor_bookings)} bookings as tutor")
        
        # Enrichir avec les infos utilisateur
        enriched_student_bookings = []
        for booking in student_bookings:
            tutor_info = await get_user_by_wallet(booking.get("tutorAddress"), authorization)
            booking["tutor"] = {
                "firstName": tutor_info.get("firstName", "Inconnu") if tutor_info else "Inconnu",
                "lastName": tutor_info.get("lastName", "") if tutor_info else "",
                "email": tutor_info.get("email", "") if tutor_info else ""
            }
            booking["myRole"] = "student"  # Indiquer que dans ce booking, l'utilisateur est student
            enriched_student_bookings.append(booking)
        
        enriched_tutor_bookings = []
        for booking in tutor_bookings:
            student_info = await get_user_by_wallet(booking.get("studentAddress"), authorization)
            booking["student"] = {
                "firstName": student_info.get("firstName", "Inconnu") if student_info else "Inconnu",
                "lastName": student_info.get("lastName", "") if student_info else "",
                "email": student_info.get("email", "") if student_info else ""
            }
            booking["myRole"] = "tutor"  # Indiquer que dans ce booking, l'utilisateur est tutor
            enriched_tutor_bookings.append(booking)
        
        # Filtrer par status si demandé
        if status and status.lower() != "all":
            enriched_student_bookings = [b for b in enriched_student_bookings if b["status"].lower() == status.lower()]
            enriched_tutor_bookings = [b for b in enriched_tutor_bookings if b["status"].lower() == status.lower()]
        
        logger.info(f"[GET_ALL_BOOKINGS] Returning {len(enriched_student_bookings)} as student, {len(enriched_tutor_bookings)} as tutor")
        
        return {
            "success": True,
            "data": {
                "asStudent": enriched_student_bookings,   # Réservations faites
                "asTutor": enriched_tutor_bookings,       # Réservations reçues
                "total": len(enriched_student_bookings) + len(enriched_tutor_bookings)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET_ALL_BOOKINGS] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")


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


# ===================== REVIEW ENDPOINTS =====================

@router.post("/booking/{bookingId}/submit-review")
async def submit_review(
    bookingId: str,
    review_data: Dict[str, Any],
    user_id: str = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Soumettre un avis sur un autre utilisateur après un cours
    
    review_data: {
        "targetUserId": "...",
        "comment": "Avis textuel",
        "rating": 4 (optionnel, 1-5 pour les étudiants évaluant les tuteurs),
        "confidenceRating": 4 (optionnel, 1-5 pour note de confiance)
    }
    """
    try:
        logger.info(f"[SUBMIT_REVIEW] Booking {bookingId}, reviewer {user_id}")
        
        # Récupérer le booking ID depuis la blockchain
        try:
            blockchain_booking_id = blockchain_manager.escrow_contract.functions.getBookingByFrontendId(
                blockchain_manager.uuid_to_bytes32(bookingId)
            ).call()
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Réservation non trouvée: {str(e)}")
        
        # Récupérer les données du booking
        try:
            booking_data = blockchain_manager.escrow_contract.functions.getBooking(blockchain_booking_id).call()
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Données booking non trouvées: {str(e)}")
        
        # Get addresses from booking data
        student_wallet = str(booking_data[1]).lower()  # studentAddress is at index 1
        tutor_wallet = str(booking_data[2]).lower()    # tutorAddress is at index 2
        
        # Convert user_id to wallet address for comparison
        try:
            user_wallet_info = blockchain_manager.get_user_wallet(user_id)
            user_wallet = str(user_wallet_info.get('address', '')).lower()
        except Exception as e:
            logger.error(f"Erreur conversion user_id to wallet: {str(e)}")
            raise HTTPException(status_code=403, detail="Impossible de vérifier votre identité")
        
        if user_wallet not in [student_wallet, tutor_wallet]:
            raise HTTPException(status_code=403, detail="Vous n'êtes pas partie de cette réservation")
        
        # Déterminer le type de reviewer
        reviewer_type = 'tutor' if user_wallet == tutor_wallet else 'student'
        
        target_user_id = review_data.get('targetUserId')
        if not target_user_id:
            raise HTTPException(status_code=400, detail="targetUserId manquant")
        
        comment = review_data.get('comment', '').strip()
        if not comment:
            raise HTTPException(status_code=400, detail="Avis vide requis")
        
        # Préparer les données pour authservice
        review_payload = {
            'bookingId': str(bookingId),
            'reviewerId': str(user_id),
            'targetUserId': str(target_user_id),
            'comment': comment,
            'reviewerType': reviewer_type,
            'rating': review_data.get('rating')  # optionnel
        }
        
        # Appeler authservice pour créer/mettre à jour l'avis
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
            "data": response.json().get('review') or response.json()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SUBMIT_REVIEW] Erreur: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur soumission avis: {str(e)}")


@router.post("/booking/{bookingId}/confirm-review")
async def confirm_review(
    bookingId: str,
    user_id: str = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Confirmer un avis de manière irréversible
    
    Quand les deux parties ont confirmé, les fonds du tuteur sont débloqués
    et la réservation passe en REVIEW_COMPLETED
    """
    try:
        logger.info(f"[CONFIRM_REVIEW] Booking {bookingId}, reviewer {user_id}")
        
        # Récupérer le booking ID depuis la blockchain
        try:
            blockchain_booking_id = blockchain_manager.escrow_contract.functions.getBookingByFrontendId(
                blockchain_manager.uuid_to_bytes32(bookingId)
            ).call()
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Réservation non trouvée: {str(e)}")
        
        # Récupérer les données du booking
        try:
            booking_data = blockchain_manager.escrow_contract.functions.getBooking(blockchain_booking_id).call()
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Données booking non trouvées: {str(e)}")
        
        # Get addresses from booking data
        student_wallet = str(booking_data[1]).lower()  # studentAddress is at index 1
        tutor_wallet = str(booking_data[2]).lower()    # tutorAddress is at index 2
        
        # Convert user_id to wallet address for comparison
        try:
            user_wallet_info = blockchain_manager.get_user_wallet(user_id)
            user_wallet = str(user_wallet_info.get('address', '')).lower()
        except Exception as e:
            logger.error(f"Erreur conversion user_id to wallet: {str(e)}")
            raise HTTPException(status_code=403, detail="Impossible de vérifier votre identité")
        
        if user_wallet not in [student_wallet, tutor_wallet]:
            raise HTTPException(status_code=403, detail="Vous n'êtes pas partie de cette réservation")
        
        # Appeler authservice pour confirmer l'avis
        headers = {"Authorization": authorization} if authorization else {}
        response = requests.post(
            f"{blockchain_manager.auth_service_url}/api/reviews/{bookingId}/{user_id}/confirm",
            headers=headers,
            timeout=5
        )
        
        if response.status_code not in [200, 201]:
            logger.error(f"Erreur confirmation review: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Erreur confirmation avis")
        
        result = response.json()
        all_confirmed = result.get('allPartiesConfirmed', False)
        updated_status = None
        money_released = False
        
        # Si les deux parties ont confirmé, débloquer les fonds du tuteur
        if all_confirmed:
            logger.info(f"[CONFIRM_REVIEW] Les deux parties ont confirmé! Débloquage fonds tuteur")
            
            try:
                amount_edu = float(blockchain_manager.w3.from_wei(booking_data[3], 'ether'))
                start_time = booking_data[4]
                now_ts = int(datetime.now().timestamp())

                logger.info(f"💰 Transfert de {amount_edu} EDU du escrow au tuteur {tutor_wallet}")

                if now_ts < start_time:
                    logger.info("[CONFIRM_REVIEW] Cours pas encore commencé, transfert reporté")
                else:
                    booking_status = blockchain_manager.get_booking_status(blockchain_booking_id)

                    # ✅ CORRECTION: Convertir les adresses en checksum format avant d'appeler le smart contract
                    student_wallet_checksum = blockchain_manager.w3.to_checksum_address(student_wallet)
                    tutor_wallet_checksum = blockchain_manager.w3.to_checksum_address(tutor_wallet)
                    
                    student_user_id = blockchain_manager.bytes32_to_uuid(
                        blockchain_manager.token_contract.functions.getUserId(student_wallet_checksum).call()
                    )
                    tutor_user_id = blockchain_manager.bytes32_to_uuid(
                        blockchain_manager.token_contract.functions.getUserId(tutor_wallet_checksum).call()
                    )

                    if student_user_id and not booking_status.get("student_confirmed"):
                        blockchain_manager.confirm_course_outcome(blockchain_booking_id, student_user_id, True)

                    if tutor_user_id and not booking_status.get("tutor_confirmed"):
                        blockchain_manager.confirm_course_outcome(blockchain_booking_id, tutor_user_id, True)

                    updated_status = blockchain_manager.get_booking_status(blockchain_booking_id)
                    money_released = updated_status.get("status") == "COMPLETED"
                    logger.info(f"✅ Statut après confirmations: {updated_status.get('status')}")
                
                    # 🌟 Mettre à jour le rating du tuteur (calculer la moyenne de tous ses avis)
                    try:
                        logger.info(f"📊 Mise à jour rating tuteur {tutor_user_id}")
                        rating_response = requests.post(
                            f"{blockchain_manager.auth_service_url}/api/profile/update-rating/{tutor_user_id}",
                            headers=headers,
                            timeout=5
                        )
                        if rating_response.status_code == 200:
                            rating_data = rating_response.json()
                            logger.info(f"✅ Rating tuteur mis à jour: {rating_data.get('rating')}/5")
                        else:
                            logger.warning(f"⚠️ Erreur mise à jour rating: {rating_response.status_code}")
                    except Exception as rating_error:
                        logger.warning(f"⚠️ Erreur calcul rating tuteur: {rating_error}")
                        # Ne pas bloquer le flow si la mise à jour du rating échoue
                
            except Exception as e:
                logger.error(f"Erreur déblocage fonds: {str(e)}")
                # Ne pas bloquer le flow si déblocage échoue, continue
        
        return {
            "success": True,
            "message": "Avis confirmé de manière irréversible",
            "allPartiesConfirmed": all_confirmed,
            "moneyReleased": money_released,
            "bookingStatus": updated_status.get("status") if updated_status else None,
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CONFIRM_REVIEW] Erreur: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur confirmation avis: {str(e)}")


@router.get("/booking/{bookingId}/reviews")
async def get_booking_reviews(
    bookingId: str,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Obtenir les avis pour une réservation"""
    try:
        headers = {"Authorization": authorization} if authorization else {}
        
        response = requests.get(
            f"{blockchain_manager.auth_service_url}/api/reviews/{bookingId}",
            headers=headers,
            timeout=5
        )
        
        if response.status_code != 200:
            logger.warning(f"Pas d'avis trouvés pour booking {bookingId}")
            return {
                "success": True,
                "reviews": [],
                "allConfirmed": False,
                "count": 0
            }
        
        return response.json()
        
    except Exception as e:
        logger.error(f"[GET_BOOKING_REVIEWS] Erreur: {str(e)}")
        return {
            "success": False,
            "reviews": [],
            "error": str(e)
        }