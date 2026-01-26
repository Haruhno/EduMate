from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import requests
import logging

from .blockchain import blockchain_manager
from .models import WalletBalance, Transaction, TransferRequest, TransferResponse

router = APIRouter()
logger = logging.getLogger(__name__)

async def verify_user_and_get_auth_data(user_id: str) -> Dict[str, Any]:
    """Vérifier que l'utilisateur existe dans la BDD et récupérer ses données"""
    try:
        response = requests.get(
            f"{blockchain_manager.auth_service_url}/api/users/{user_id}",
            timeout=5
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé dans la base de données")
        
        return response.json()["data"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur vérification utilisateur: {str(e)}")

@router.get("/balance")
async def get_balance(userId: str = Query(...)) -> Dict[str, Any]:
    """Obtenir le solde d'un wallet - Vérifie d'abord si l'utilisateur existe dans la BDD"""
    try:
        # Vérifier que l'utilisateur existe dans la BDD
        user_data = await verify_user_and_get_auth_data(userId)
        
        # Obtenir ou créer le wallet déterministe
        wallet = blockchain_manager.get_user_wallet(userId)
        
        # Si le wallet n'existe pas encore sur la blockchain, le créer
        if not wallet.get("exists_on_chain", False):
            try:
                # Enregistrer le wallet sur la blockchain et distribuer 500 EDUcoins
                tx_hash = blockchain_manager.register_user_wallet_on_chain(userId)
                logger.info(f"Wallet créé pour {userId}: {wallet['address']}")
            except Exception as e:
                # Si le wallet existe déjà, c'est OK
                if "déjà enregistré" not in str(e):
                    raise
        
        # Récupérer le solde depuis la blockchain
        edu_balance = blockchain_manager.get_token_balance(wallet["address"])
        
        # Calculer les fonds verrouillés dans les escrows
        locked_balance = 0.0
        
        response_data = WalletBalance(
            user={
                "id": user_data.get("id"),
                "firstName": user_data.get("firstName", "Utilisateur"),
                "lastName": user_data.get("lastName", ""),
                "email": user_data.get("email"),
                "role": user_data.get("role", "student")
            },
            wallet={
                "available": float(edu_balance),
                "locked": locked_balance,
                "total": float(edu_balance),
                "walletAddress": wallet["address"],
                "kycStatus": "verified"
            }
        )
        
        return {
            "success": True,
            "message": "Solde récupéré avec succès",
            "data": response_data.dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur récupération solde: {str(e)}")

@router.post("/transfer")
async def transfer(
    transfer_data: TransferRequest, 
    fromUserId: str = Query(...)
) -> Dict[str, Any]:
    """Effectuer un transfert - Vérifie d'abord si l'utilisateur existe dans la BDD et retourne le solde des deux wallets"""
    try:
        # Vérifier que l'expéditeur existe dans la BDD
        from_user_data = await verify_user_and_get_auth_data(fromUserId)
        
        # Effectuer le transfert sur la blockchain
        result = blockchain_manager.transfer_tokens(
            fromUserId,
            transfer_data.toWalletAddress,
            transfer_data.amount,
            transfer_data.description or ""
        )
        
        # Récupérer le solde du destinataire après le transfert
        to_balance = blockchain_manager.get_token_balance(result["to"])
        
        # Récupérer les infos du block
        block = blockchain_manager.w3.eth.get_block(result["block_number"])
        
        # Construire l'objet Transaction
        transaction = Transaction(
            id=result["transaction_hash"][:32],
            fromWalletId=result["from"],
            toWalletId=result["to"],
            amount=result["amount"],
            fee=0.0,
            transactionType="TRANSFER",
            status="completed",
            description=transfer_data.description or "Transfert de crédits",
            metadata=transfer_data.metadata or {},
            createdAt=datetime.fromtimestamp(block.timestamp).isoformat(),
            fromWallet=blockchain_manager._get_wallet_info_sync(result["from"]),
            toWallet=blockchain_manager._get_wallet_info_sync(result["to"]),
            ledgerBlock={
                "id": result["block_number"],
                "hash": block.hash.hex(),
                "timestamp": block.timestamp
            }
        )
        
        # Construire la réponse complète
        response = TransferResponse(
            success=True,
            transaction=transaction,
            ledgerBlock={
                "id": result["block_number"],
                "hash": result["transaction_hash"],
                "timestamp": datetime.fromtimestamp(block.timestamp).isoformat()
            },
            fromUser={
                "name": f"{from_user_data.get('firstName', '')} {from_user_data.get('lastName', '')}",
                "newBalance": float(blockchain_manager.get_token_balance(result["from"]))
            },
            toUser={
                "name": f"Destinataire {result['to'][:8]}",
                "newBalance": float(to_balance)
            }
        )
        
        return response.dict()
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du transfert: {str(e)}")


@router.get("/stats")
async def get_stats(userId: str = Query(...)) -> Dict[str, Any]:
    """Obtenir les statistiques d'un wallet"""
    try:
        # Vérifier que l'utilisateur existe dans la BDD
        user_data = await verify_user_and_get_auth_data(userId)
        
        # Récupérer les statistiques depuis blockchain_manager
        stats = blockchain_manager.get_wallet_stats(userId)
        
        return {
            "success": True,
            "message": "Statistiques récupérées avec succès",
            "data": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur récupération statistiques: {str(e)}")

@router.post("/wallet/register")
async def register_wallet(userId: str = Query(...)) -> Dict[str, Any]:
    """Enregistrer un wallet utilisateur sur la blockchain"""
    try:
        # Vérifier que l'utilisateur existe dans la BDD
        user_data = await verify_user_and_get_auth_data(userId)
        
        # Enregistrer sur la blockchain et distribuer 500 EDUcoins
        tx_hash = blockchain_manager.register_user_wallet_on_chain(userId)
        
        # Récupérer les infos du wallet
        wallet = blockchain_manager.get_user_wallet(userId)
        
        return {
            "success": True,
            "message": "Wallet enregistré sur la blockchain avec 500 EDUcoins",
            "data": {
                "userId": userId,
                "userEmail": user_data.get("email"),
                "address": wallet["address"],
                "transactionHash": tx_hash,
                "initialBalance": 600.0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur enregistrement wallet: {str(e)}")

@router.get("/verify-user/{userId}")
async def verify_user(userId: str) -> Dict[str, Any]:
    """Vérifier si un utilisateur existe dans la BDD et a un wallet"""
    try:
        # Vérifier dans la BDD
        user_data = await verify_user_and_get_auth_data(userId)
        
        # Vérifier sur la blockchain
        wallet = blockchain_manager.get_user_wallet(userId)
        balance = blockchain_manager.get_token_balance(wallet["address"])
        
        return {
            "success": True,
            "message": "Utilisateur vérifié",
            "data": {
                "user": {
                    "id": user_data.get("id"),
                    "email": user_data.get("email"),
                    "name": f"{user_data.get('firstName', '')} {user_data.get('lastName', '')}",
                    "role": user_data.get("role")
                },
                "wallet": {
                    "address": wallet["address"],
                    "exists_on_chain": wallet.get("exists_on_chain", False),
                    "balance": float(balance)
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Utilisateur non trouvé: {str(e)}")

@router.get("/history")
async def get_history(
    userId: str = Query(...),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    transactionType: Optional[str] = None
) -> Dict[str, Any]:
    """Récupérer l'historique des transactions depuis la blockchain"""
    try:
        # Vérifier que l'utilisateur existe
        user_data = await verify_user_and_get_auth_data(userId)
        
        # Obtenir le wallet de l'utilisateur
        wallet = blockchain_manager.get_user_wallet(userId)
        
        # Récupérer l'historique depuis la blockchain
        transactions = blockchain_manager.get_transaction_history(
            wallet["address"],
            limit=limit * 10  # Récupérer plus pour filtrer
        )
        
        # Appliquer des filtres optionnels
        filtered_transactions = transactions
        
        if transactionType:
            if transactionType == "outgoing":
                filtered_transactions = [t for t in transactions 
                                       if t["fromWalletId"] == wallet["address"]]
            elif transactionType == "incoming":
                filtered_transactions = [t for t in transactions 
                                       if t["toWalletId"] == wallet["address"]]
        
        if startDate:
            try:
                start_dt = datetime.fromisoformat(startDate.replace('Z', '+00:00'))
                filtered_transactions = [t for t in filtered_transactions 
                                       if datetime.fromisoformat(t["createdAt"].replace('Z', '+00:00')) >= start_dt]
            except:
                pass
        
        if endDate:
            try:
                end_dt = datetime.fromisoformat(endDate.replace('Z', '+00:00'))
                filtered_transactions = [t for t in filtered_transactions 
                                       if datetime.fromisoformat(t["createdAt"].replace('Z', '+00:00')) <= end_dt]
            except:
                pass
        
        # Pagination
        total = len(filtered_transactions)
        total_pages = (total + limit - 1) // limit if limit > 0 else 1
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_transactions = filtered_transactions[start_idx:end_idx]
        
        return {
            "success": True,
            "message": "Historique récupéré avec succès",
            "data": {
                "transactions": paginated_transactions,
                "total": total,
                "page": page,
                "totalPages": total_pages
            }
        }
        
    except Exception as e:
        logger.error(f"Erreur récupération historique: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur récupération historique: {str(e)}")

@router.get("/test")
async def test_connection() -> Dict[str, Any]:
    """Tester la connexion à la blockchain"""
    try:
        is_connected = blockchain_manager.w3.is_connected()
        token_name = blockchain_manager.token_contract.functions.name().call()
        escrow_count = blockchain_manager.escrow_contract.functions.getBookingCount().call()
        
        return {
            "success": True,
            "message": "Blockchain service fonctionne!",
            "data": {
                "ganache_connected": is_connected,
                "token_name": token_name,
                "booking_count": escrow_count,
                "timestamp": datetime.now().isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur test connexion: {str(e)}")