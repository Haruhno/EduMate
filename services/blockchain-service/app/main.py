from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import uvicorn
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Recharger le .env mis à jour
env_path = Path(__file__).parent.parent / ".env"  # selon ton chemin
load_dotenv(dotenv_path=env_path, override=True)

from .blockchain import blockchain_manager
from .wallet import router as wallet_router
from .booking import router as booking_router

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestion du cycle de vie de l'application"""
    # Démarrage
    logger.info("=" * 60)
    logger.info("DÉMARRAGE DU SERVICE BLOCKCHAIN EDUCOIN")
    logger.info("=" * 60)
    
    # Vérifier la connexion à la blockchain
    try:
        is_connected = blockchain_manager.w3.is_connected()
        if not is_connected:
            logger.error("ERREUR: Impossible de se connecter à Ganache")
            logger.warning("AVERTISSEMENT: Le service démarre quand même, mais certaines fonctionnalités peuvent être limitées")
        else:
            logger.info("OK: Connecté à Ganache")
            
            # Vérifier les contrats (avec gestion d'erreur robuste)
            try:
                token_name = blockchain_manager.token_contract.functions.name().call()
                token_symbol = blockchain_manager.token_contract.functions.symbol().call()
                logger.info(f"OK: Contrat token: {token_name} ({token_symbol})")
                
                escrow_count = blockchain_manager.escrow_contract.functions.getBookingCount().call()
                logger.info(f"OK: Nombre de réservations: {escrow_count}")
                
            except Exception as e:
                logger.warning(f"AVERTISSEMENT: Contrats non encore disponibles: {e}")
                logger.info("INFO: Les contrats seront chargés lorsque disponibles")
            
            # Initialiser automatiquement les wallets (en arrière-plan, sans bloquer)
            try:
                # Ne pas attendre la complétion pour démarrer le service
                import asyncio
                async def initialize_wallets_async():
                    try:
                        logger.info("INITIALISATION: Initialisation des wallets en arrière-plan...")
                        results = await blockchain_manager.initialize_all_users_wallets()
                        
                        if results:
                            success_count = sum(1 for r in results if "error" not in r)
                            error_count = sum(1 for r in results if "error" in r)
                            
                            logger.info(f"OK: {success_count} wallets initialisés avec 500 EDUcoins chacun")
                            if error_count > 0:
                                logger.info(f"AVERTISSEMENT: {error_count} erreurs lors de l'initialisation")
                    except Exception as e:
                        logger.error(f"ERREUR: Erreur initialisation wallets: {e}")
                
                # Lancer en arrière-plan sans attendre
                asyncio.create_task(initialize_wallets_async())
                    
            except Exception as e:
                logger.error(f"ERREUR: Erreur lors de l'initialisation des wallets: {e}")
                logger.warning("AVERTISSEMENT: L'initialisation automatique a échoué, mais le service continue")
    
    except Exception as e:
        logger.error(f"ERREUR: Erreur initialisation blockchain: {e}")
        logger.warning("AVERTISSEMENT: Le service démarre quand même, mais certaines fonctionnalités peuvent être limitées")
    
    yield
    
    # Arrêt
    logger.info("ARRET: Arrêt du service blockchain...")

# Création de l'application FastAPI
app = FastAPI(
    title="EduCoin Blockchain Service",
    description="Service blockchain pour EduMate - Gestion des wallets et réservations",
    version="2.0.0",
    lifespan=lifespan
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routes
app.include_router(wallet_router, prefix="/api/blockchain", tags=["blockchain"])
app.include_router(booking_router, prefix="/api/blockchain", tags=["booking"])

@app.get("/")
async def root():
    return {
        "service": "EduCoin Blockchain Service",
        "version": "2.0.0",
        "status": "running",
        "description": "Service blockchain pour EduMate - Wallets déterministes avec 500 EDUcoins initiaux",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "blockchain": "/api/blockchain",
            "booking": "/api/booking",
            "docs": "/docs",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Vérifier la santé du service"""
    try:
        # Vérifier la connexion à la blockchain
        blockchain_ok = False
        contracts_ok = False
        
        try:
            blockchain_ok = blockchain_manager.w3.is_connected()
            
            if blockchain_ok:
                try:
                    blockchain_manager.token_contract.functions.name().call()
                    blockchain_manager.escrow_contract.functions.getBookingCount().call()
                    contracts_ok = True
                except:
                    contracts_ok = False
        except:
            blockchain_ok = False
        
        # Vérifier la connexion à l'auth-service
        auth_ok = False
        try:
            import requests
            response = requests.get(f"{blockchain_manager.auth_service_url}/health", timeout=3)
            auth_ok = response.status_code == 200
        except:
            auth_ok = False
        
        status = "healthy" if blockchain_ok else "degraded"
        
        return {
            "status": status,
            "service": "Blockchain Service",
            "timestamp": datetime.now().isoformat(),
            "components": {
                "blockchain": {
                    "connected": blockchain_ok,
                    "contracts_available": contracts_ok
                },
                "auth_service": {
                    "connected": auth_ok,
                    "url": blockchain_manager.auth_service_url
                }
            }
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "Blockchain Service",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/status")
async def get_status():
    """Obtenir le statut détaillé du service"""
    try:
        # Informations blockchain (avec gestion d'erreur)
        block_number = 0
        gas_price = 0
        token_name = "Unknown"
        token_supply = 0
        booking_count = 0
        
        try:
            if blockchain_manager.w3.is_connected():
                block_number = blockchain_manager.w3.eth.block_number
                gas_price = blockchain_manager.w3.eth.gas_price
                
                token_name = blockchain_manager.token_contract.functions.name().call()
                token_supply = blockchain_manager.w3.from_wei(
                    blockchain_manager.token_contract.functions.totalSupply().call(),
                    'ether'
                )
                
                booking_count = blockchain_manager.escrow_contract.functions.getBookingCount().call()
        except Exception as e:
            logger.warning(f"AVERTISSEMENT: Impossible de récupérer les infos blockchain: {e}")
        
        return {
            "success": True,
            "data": {
                "network": {
                    "provider": "ganache",
                    "block_number": block_number,
                    "gas_price": gas_price,
                    "connected": blockchain_manager.w3.is_connected()
                },
                "contracts": {
                    "token": {
                        "name": token_name,
                        "address": blockchain_manager.token_address,
                        "total_supply": float(token_supply)
                    },
                    "escrow": {
                        "address": blockchain_manager.escrow_address,
                        "booking_count": booking_count
                    }
                },
                "service": {
                    "startup_time": "on_lifespan",
                    "wallet_initialization": "automatic",
                    "initial_balance": 600
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur récupération status: {str(e)}")

@app.post("/api/blockchain/initialize-all")
async def initialize_all_wallets():
    """Initialiser manuellement les wallets pour tous les utilisateurs"""
    try:
        results = await blockchain_manager.initialize_all_users_wallets()
        
        success_count = sum(1 for r in results if "error" not in r)
        error_count = sum(1 for r in results if "error" in r)
        
        return {
            "success": True,
            "message": f"Initialisation manuelle terminée: {success_count} succès, {error_count} erreurs",
            "data": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur initialisation: {str(e)}")

@app.get("/api/blockchain/debug/users")
async def debug_users():
    """Endpoint de debug pour voir les utilisateurs et leurs wallets"""
    try:
        import requests
        
        # Récupérer les utilisateurs depuis l'auth-service
        response = requests.get(f"{blockchain_manager.auth_service_url}/api/users")
        users = response.json().get("data", []) if response.status_code == 200 else []
        
        debug_info = []
        for user in users[:10]:  # Limiter aux 10 premiers pour la performance
            user_id = user.get("id")
            if user_id:
                try:
                    wallet = blockchain_manager.get_user_wallet(user_id)
                    balance = blockchain_manager.get_token_balance(wallet["address"])
                    
                    debug_info.append({
                        "user": {
                            "id": user_id,
                            "email": user.get("email"),
                            "name": f"{user.get('firstName', '')} {user.get('lastName', '')}"
                        },
                        "wallet": {
                            "address": wallet["address"],
                            "exists_on_chain": wallet.get("exists_on_chain", False),
                            "balance": float(balance)
                        }
                    })
                except Exception as e:
                    logger.warning(f"AVERTISSEMENT: Erreur debug user {user_id}: {e}")
        
        return {
            "success": True,
            "data": debug_info
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur debug: {str(e)}")

def main():
    """Fonction principale pour démarrer le service"""
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=3003,
        log_level="info"
    )

if __name__ == "__main__":
    main()