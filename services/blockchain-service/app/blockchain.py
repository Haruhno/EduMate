from web3 import Web3, HTTPProvider
from web3.middleware import geth_poa_middleware
from eth_account import Account
from eth_account.messages import encode_defunct
import hashlib
import hmac
import os
import uuid
from typing import Dict, List, Optional, Tuple, Any
import logging
import requests
from datetime import datetime

logger = logging.getLogger(__name__)

class DeterministicWalletGenerator:
    """Génère des wallets Ethereum déterministes depuis un userId"""
    
    def __init__(self, master_secret: str = "edumate-blockchain-master-secret-2024"):
        self.master_secret = master_secret.encode()
    
    def get_wallet_for_user(self, user_id: str) -> Tuple[str, str]:
        """
        Génère une paire de clés déterministe pour un userId
        Retourne (private_key, address)
        """
        # HMAC-SHA256 pour garantir la déterminisme
        seed = hmac.new(
            self.master_secret,
            user_id.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        # La seed devient la clé privée
        private_key = "0x" + seed.hex()
        
        # Créer le compte
        account = Account.from_key(private_key)
        
        return private_key, account.address


class BlockchainManager:
    """Gestionnaire de la blockchain - Zéro stockage local"""
    
    def __init__(self, auth_service_url: str = "http://localhost:3001"):
        self.w3 = Web3(HTTPProvider("http://127.0.0.1:8545"))
        
        if not self.w3.is_connected():
            raise ConnectionError("Impossible de se connecter à Ganache")
        
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        self.auth_service_url = auth_service_url
        
        # Charger les contrats depuis l'environnement
        self.load_contracts_from_env()
        
        # Générateur de wallets déterministes
        self.wallet_generator = DeterministicWalletGenerator()
        
        logger.info("✅ BlockchainManager initialisé - 100% on-chain")
    
    def uuid_to_bytes32(self, uuid_str: str) -> bytes:
        """
        Convertit un UUID string (format: d755226e-bb7b-4bec-9af0-e578da8362dc)
        en bytes32 compatibles Solidity de manière déterministe.
        
        Args:
            uuid_str: UUID au format string standard
            
        Returns:
            bytes32 (32 octets) prêt pour registerWallet
        """
        # Nettoyer l'UUID (supprimer les tirets, mettre en minuscules)
        clean_uuid = uuid_str.replace('-', '').lower()
        
        # Vérifier la longueur (32 caractères hexadécimaux = 16 octets)
        if len(clean_uuid) != 32:
            raise ValueError(f"UUID invalide après nettoyage: {clean_uuid}")
        
        # Convertir en bytes (16 octets) et padding à 32 octets avec des zéros
        # ✅ CORRECTION: Utiliser ljust au lieu de SHA256 pour garder la réversibilité
        uuid_bytes = bytes.fromhex(clean_uuid).ljust(32, b'\x00')
        
        return uuid_bytes

    def bytes32_to_uuid(self, value: bytes) -> Optional[str]:
        """
        Convertit un bytes32 (padding à droite) vers un UUID canonique.
        Retourne None si la valeur ne correspond pas à un UUID valide.
        """
        if not value or len(value) < 16:
            return None

        # Ignorer les valeurs vides (tout zéro)
        if all(b == 0 for b in value):
            return None

        try:
            # On a stocké l'UUID sur les 16 premiers octets puis padding zeros à droite
            return str(uuid.UUID(bytes=bytes(value[:16])))
        except Exception:
            return None
    
    def load_contracts_from_env(self):
        """Charger les adresses des contrats depuis les variables d'environnement"""
        self.token_address = os.getenv("EDU_TOKEN_ADDRESS")
        self.escrow_address = os.getenv("BOOKING_ESCROW_ADDRESS")
        
        if not self.token_address or not self.escrow_address:
            raise ValueError("Adresses des contrats non configurées dans l'environnement")
        
        # ABIs fixes
        self.token_abi = [
            {"constant": True, "inputs": [], "name": "name", "outputs": [{"name": "", "type": "string"}], "type": "function"},
            {"constant": True, "inputs": [], "name": "symbol", "outputs": [{"name": "", "type": "string"}], "type": "function"},
            {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "type": "function"},
            {"constant": True, "inputs": [{"name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
            {"constant": False, "inputs": [{"name": "spender", "type": "address"}, {"name": "value", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
            
            # ✅ CORRECTION: Fonction séparée pour éviter la surcharge (bloquant Web3)
            {"constant": False, "inputs": [{"name": "to", "type": "address"}, {"name": "value", "type": "uint256"}, {"name": "description", "type": "string"}], "name": "transferWithDescription", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
            
            # Fonction transfer standard ERC20 (sans description)
            {"constant": False, "inputs": [{"name": "to", "type": "address"}, {"name": "value", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
            {"constant": False, "inputs": [{"name": "from", "type": "address"}, {"name": "to", "type": "address"}, {"name": "value", "type": "uint256"}], "name": "transferFrom", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
            {"constant": False, "inputs": [{"name": "userId", "type": "bytes32"}, {"name": "walletAddress", "type": "address"}], "name": "registerWallet", "outputs": [], "type": "function"},
            {"constant": True, "inputs": [{"name": "userId", "type": "bytes32"}], "name": "getWalletAddress", "outputs": [{"name": "", "type": "address"}], "type": "function"},
            
            # ✅ AJOUT: Getter pour addressToUserId
            {"constant": True, "inputs": [{"name": "wallet", "type": "address"}], "name": "getUserId", "outputs": [{"name": "", "type": "bytes32"}], "type": "function"},
            
            {"constant": True, "inputs": [], "name": "owner", "outputs": [{"name": "", "type": "address"}], "type": "function"},
            {"constant": False, "inputs": [{"name": "walletAddress", "type": "address"}, {"name": "amount", "type": "uint256"}], "name": "mintInitialTokens", "outputs": [], "type": "function"},
            {"constant": True, "inputs": [{"name": "user", "type": "address"}], "name": "hasInitialBalance", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
            
            # ✅ Event Transfer standard ERC20
            {"anonymous": False, "inputs": [
                {"indexed": True, "name": "from", "type": "address"},
                {"indexed": True, "name": "to", "type": "address"},
                {"indexed": False, "name": "value", "type": "uint256"}
            ], "name": "Transfer", "type": "event"},
            
            # ✅ Event EduTransfer pour l'historique
            {"anonymous": False, "inputs": [
                {"indexed": True, "name": "from", "type": "address"},
                {"indexed": True, "name": "to", "type": "address"},
                {"indexed": False, "name": "amount", "type": "uint256"},
                {"indexed": False, "name": "description", "type": "string"},
                {"indexed": False, "name": "timestamp", "type": "uint256"}
            ], "name": "EduTransfer", "type": "event"}
        ]
        
        self.escrow_abi = [
            {"constant": False, "inputs": [{"name": "tutor", "type": "address"}, {"name": "amount", "type": "uint256"}, {"name": "startTime", "type": "uint256"}, {"name": "duration", "type": "uint256"}, {"name": "description", "type": "string"}, {"name": "frontendId", "type": "bytes32"}], "name": "createBooking", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
            {"constant": False, "inputs": [{"name": "bookingId", "type": "uint256"}], "name": "confirmBooking", "outputs": [], "type": "function"},
            {"constant": False, "inputs": [{"name": "bookingId", "type": "uint256"}], "name": "rejectBooking", "outputs": [], "type": "function"},
            {"constant": False, "inputs": [{"name": "bookingId", "type": "uint256"}, {"name": "courseHeld", "type": "bool"}], "name": "confirmCourseOutcome", "outputs": [], "type": "function"},
            {"constant": True, "inputs": [{"name": "bookingId", "type": "uint256"}], "name": "getBooking", "outputs": [{"name": "id", "type": "uint256"}, {"name": "student", "type": "address"}, {"name": "tutor", "type": "address"}, {"name": "amount", "type": "uint256"}, {"name": "startTime", "type": "uint256"}, {"name": "duration", "type": "uint256"}, {"name": "status", "type": "uint8"}, {"name": "outcome", "type": "uint8"}, {"name": "createdAt", "type": "uint256"}, {"name": "studentConfirmed", "type": "bool"}, {"name": "tutorConfirmed", "type": "bool"}, {"name": "description", "type": "string"}, {"name": "frontendId", "type": "bytes32"}], "type": "function"},
            {"constant": True, "inputs": [{"name": "frontendId", "type": "bytes32"}], "name": "getBookingByFrontendId", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
            {"constant": True, "inputs": [], "name": "getBookingCount", "outputs": [{"name": "", "type": "uint256"}], "type": "function"}
        ]
        
        # Convertir les adresses en checksum
        self.token_address = self.w3.to_checksum_address(self.token_address)
        self.escrow_address = self.w3.to_checksum_address(self.escrow_address)
        
        self.token_contract = self.w3.eth.contract(
            address=self.token_address,
            abi=self.token_abi
        )
        
        self.escrow_contract = self.w3.eth.contract(
            address=self.escrow_address,
            abi=self.escrow_abi
        )
    
    def get_transaction_history(self, user_wallet_address: str, limit: int = 50) -> List[Dict]:
        """
        Récupère l'historique des transactions depuis la blockchain
        en utilisant get_logs (méthode fiable pour Ganache)
        Récupère DEUX types d'événements:
        1. EduTransfer (transferts avec description)
        2. Transfer standard (transferFrom utilisé par les bookings)
        """
        try:
            wallet_address = self.w3.to_checksum_address(user_wallet_address)
            
            # Obtenir l'adresse du owner pour filtrer les initialisations
            owner_address = self.token_contract.functions.owner().call()
            
            # Format pour les topics
            address_hash_from = f'0x{wallet_address[2:].rjust(64, "0")}'
            address_hash_to = address_hash_from
            
            transactions = []
            
            try:
                # ============ ÉVÉNEMENTS EduTransfer (custom avec description) ============
                edu_event_signature = self.w3.keccak(text="EduTransfer(address,address,uint256,string,uint256)").hex()
                
                # EduTransfer où l'utilisateur est l'expéditeur
                edu_logs_from = self.w3.eth.get_logs({
                    'fromBlock': 0,
                    'toBlock': 'latest',
                    'address': self.token_address,
                    'topics': [
                        edu_event_signature,
                        address_hash_from
                    ]
                })
                
                # EduTransfer où l'utilisateur est le destinataire
                edu_logs_to = self.w3.eth.get_logs({
                    'fromBlock': 0,
                    'toBlock': 'latest',
                    'address': self.token_address,
                    'topics': [
                        edu_event_signature,
                        None,
                        address_hash_to
                    ]
                })
                
                # ============ ÉVÉNEMENTS Transfer standard (ERC20) ============
                transfer_event_signature = self.w3.keccak(text="Transfer(address,address,uint256)").hex()
                
                # Transfer où l'utilisateur est l'expéditeur
                transfer_logs_from = self.w3.eth.get_logs({
                    'fromBlock': 0,
                    'toBlock': 'latest',
                    'address': self.token_address,
                    'topics': [
                        transfer_event_signature,
                        address_hash_from
                    ]
                })
                
                # Transfer où l'utilisateur est le destinataire
                transfer_logs_to = self.w3.eth.get_logs({
                    'fromBlock': 0,
                    'toBlock': 'latest',
                    'address': self.token_address,
                    'topics': [
                        transfer_event_signature,
                        None,
                        address_hash_to
                    ]
                })
                
                # Combiner tous les logs
                all_logs = edu_logs_from + edu_logs_to + transfer_logs_from + transfer_logs_to
                
                # Déduplication par transactionHash
                unique_logs = {
                    log['transactionHash'].hex(): log
                    for log in all_logs
                }.values()
                
                # Traiter les logs
                for log in sorted(unique_logs, key=lambda x: x['blockNumber'], reverse=True)[:limit]:
                    try:
                        # Récupérer les infos du block
                        block = self.w3.eth.get_block(log['blockNumber'])
                        
                        # Déterminer le type d'événement
                        is_edu_transfer = log['topics'][0].hex() == edu_event_signature
                        
                        if is_edu_transfer:
                            # Décoder EduTransfer
                            event = self.token_contract.events.EduTransfer().process_log(log)
                            description = event['args']['description']
                            amount = float(self.w3.from_wei(event['args']['amount'], 'ether'))
                        else:
                            # Décoder Transfer standard
                            event = self.token_contract.events.Transfer().process_log(log)
                            amount = float(self.w3.from_wei(event['args']['value'], 'ether'))
                            
                            # FILTRER les transferts d'initialisation (owner → user, 600 EDU)
                            from_address = event['args']['from']
                            to_address = event['args']['to']
                            if from_address == owner_address and amount == 600.0:
                                logger.debug(f"Filtrage transfert initialisation: {amount} EDU de {from_address} vers {to_address}")
                                continue
                            
                            # Description par défaut
                            description = "Transfert de tokens"
                        
                        # Enrichir les métadonnées pour les bookings
                        metadata = {}
                        if event['args']['to'] == self.escrow_address:
                            # C'est un booking - chercher le booking correspondant
                            try:
                                booking_count = self.escrow_contract.functions.getBookingCount().call()
                                # Chercher le booking avec le même étudiant et montant
                                for booking_id in range(booking_count):
                                    booking = self.escrow_contract.functions.getBooking(booking_id).call()
                                    booking_student = booking[1]
                                    booking_tutor = booking[2]
                                    booking_amount = float(self.w3.from_wei(booking[3], 'ether'))
                                    booking_description = booking[11]  # Index de la description dans le struct
                                    
                                    if booking_student == event['args']['from'] and abs(booking_amount - amount) < 0.01:
                                        # Utiliser la description du booking depuis la blockchain
                                        description = booking_description
                                        # Récupérer les infos du tuteur depuis la BDD
                                        try:
                                            tutor_user_id_bytes = self.token_contract.functions.getUserId(booking_tutor).call()
                                            tutor_user_id = self.bytes32_to_uuid(tutor_user_id_bytes)
                                            
                                            if tutor_user_id:
                                                # Appeler l'auth-service pour avoir les infos du tuteur
                                                import requests
                                                tutor_resp = requests.get(
                                                    f"{self.auth_service_url}/api/users/{tutor_user_id}",
                                                    timeout=3
                                                )
                                                if tutor_resp.status_code == 200:
                                                    tutor_data = tutor_resp.json().get("data", {})
                                                    metadata = {
                                                        "bookingId": booking_id,
                                                        "tutorName": f"{tutor_data.get('firstName', '')} {tutor_data.get('lastName', '')}".strip(),
                                                        "tutorId": tutor_user_id,
                                                        "annonceId": None,  # On ne peut pas le récupérer depuis la blockchain
                                                        "startTime": booking[4],
                                                        "duration": booking[5]
                                                    }
                                        except Exception as tutor_err:
                                            logger.warning(f"Erreur récupération infos tuteur: {tutor_err}")
                                        
                                        break
                            except Exception as booking_err:
                                logger.warning(f"Erreur enrichissement booking: {booking_err}")
                        
                        # Formatter la transaction
                        transaction = {
                            "id": log['transactionHash'].hex()[:32],
                            "fromWalletId": event['args']['from'],
                            "toWalletId": event['args']['to'],
                            "amount": amount,
                            "fee": 0.0,
                            "transactionType": "BOOKING" if event['args']['to'] == self.escrow_address else "TRANSFER",
                            "status": "completed",
                            "description": description,
                            "metadata": metadata,
                            "createdAt": datetime.fromtimestamp(block['timestamp']).isoformat(),
                            "fromWallet": self._get_wallet_info_sync(event['args']['from']),
                            "toWallet": self._get_wallet_info_sync(event['args']['to']),
                            "ledgerBlock": {
                                "id": log['blockNumber'],
                                "hash": block['hash'].hex(),
                                "timestamp": block['timestamp']
                            }
                        }
                        transactions.append(transaction)
                        
                    except Exception as e:
                        logger.warning(f"Erreur traitement log: {e}")
                        continue
                        
            except Exception as e:
                logger.error(f"Erreur récupération logs: {e}")
            
            return transactions
            
        except Exception as e:
            logger.error(f"Erreur récupération historique pour {user_wallet_address}: {e}")
            return []
    
    def _get_wallet_info_sync(self, wallet_address: str) -> Dict:
        """
        Récupère les infos utilisateur depuis l'auth-service pour une adresse wallet (sync)
        """
        try:
            # Essayer de récupérer le userId depuis la blockchain et le normaliser
            try:
                user_id_bytes = self.token_contract.functions.getUserId(wallet_address).call()
                user_id = self.bytes32_to_uuid(user_id_bytes)

                if user_id:
                    response = requests.get(
                        f"{self.auth_service_url}/api/users/{user_id}",
                        timeout=3
                    )
                    if response.status_code == 200:
                        user_data = response.json().get("data", {})
                        return {
                            "id": user_id,
                            "userId": user_data.get("id"),
                            "walletAddress": wallet_address,
                            "user": {
                                "id": user_data.get("id"),
                                "firstName": user_data.get("firstName", ""),
                                "lastName": user_data.get("lastName", ""),
                                "email": user_data.get("email", "")
                            }
                        }
            except Exception as e:
                logger.debug(f"Impossible de normaliser l'userId pour {wallet_address}: {e}")
            
            # Fallback: juste l'adresse
            return {
                "id": wallet_address,
                "walletAddress": wallet_address,
                "user": None
            }
        except:
            return {
                "id": wallet_address,
                "walletAddress": wallet_address,
                "user": None
            }
    
    async def verify_user_exists(self, user_id: str) -> Dict:
        """Vérifier que l'utilisateur existe dans l'auth-service"""
        try:
            response = requests.get(
                f"{self.auth_service_url}/api/users/{user_id}",
                timeout=5
            )
            if response.status_code == 200:
                return response.json().get("data", {})
            return None
        except:
            return None
    
    def get_user_wallet(self, user_id: str) -> Dict[str, str]:
        """
        Obtenir ou créer un wallet déterministe pour un utilisateur
        Retourne { "address": "...", "private_key": "..." }
        """
        # Convertir l'UUID en bytes32
        user_id_bytes32 = self.uuid_to_bytes32(user_id)
        
        # Vérifier d'abord sur la blockchain si le wallet est déjà enregistré
        try:
            existing_address = self.token_contract.functions.getWalletAddress(
                user_id_bytes32
            ).call()
            
            if existing_address != "0x0000000000000000000000000000000000000000":
                # Wallet existe sur la blockchain, générer la clé privée déterministement
                private_key, address = self.wallet_generator.get_wallet_for_user(user_id)
                # Convertir l'adresse en checksum
                address = self.w3.to_checksum_address(address)
                return {
                    "address": address,
                    "private_key": private_key,
                    "exists_on_chain": True
                }
        except:
            pass
        
        # Créer un nouveau wallet déterministe
        private_key, address = self.wallet_generator.get_wallet_for_user(user_id)
        # Convertir l'adresse en checksum
        address = self.w3.to_checksum_address(address)
        
        return {
            "address": address,
            "private_key": private_key,
            "exists_on_chain": False
        }
    
    def get_wallet_stats(self, user_id: str) -> Dict[str, Any]:
        """Récupérer les statistiques détaillées depuis la blockchain"""
        try:
            wallet = self.get_user_wallet(user_id)
            address = wallet["address"]
            
            # Récupérer le solde
            available_balance = self.get_token_balance(address)
            
            # Récupérer l'historique pour calculer les stats
            transactions = self.get_transaction_history(address, limit=100)
            
            # Calculer les stats
            today_sent = 0.0
            today_received = 0.0
            monthly_sent = 0.0
            monthly_received = 0.0
            all_time_sent = 0.0
            all_time_received = 0.0
            all_time_fees = 0.0
            
            today = datetime.now().date()
            current_month = datetime.now().month
            current_year = datetime.now().year
            
            for tx in transactions:
                try:
                    tx_date = datetime.fromisoformat(tx["createdAt"].replace('Z', '+00:00'))
                    amount = tx["amount"]
                    
                    if tx["fromWalletId"] == address:
                        # Transaction sortante
                        all_time_sent += amount
                        
                        if tx_date.date() == today:
                            today_sent += amount
                        
                        if tx_date.month == current_month and tx_date.year == current_year:
                            monthly_sent += amount
                            
                    elif tx["toWalletId"] == address:
                        # Transaction entrante
                        all_time_received += amount
                        
                        if tx_date.date() == today:
                            today_received += amount
                        
                        if tx_date.month == current_month and tx_date.year == current_year:
                            monthly_received += amount
                    
                    # Ajouter les frais si présents
                    all_time_fees += tx.get("fee", 0.0)
                except:
                    continue
            
            stats = {
                "wallet": {
                    "available": float(available_balance),
                    "locked": 0.0,
                    "total": float(available_balance),
                    "address": address,
                    "kycStatus": "verified"
                },
                "today": {
                    "sent": today_sent,
                    "received": today_received
                },
                "monthly": {
                    "sent": monthly_sent,
                    "received": monthly_received
                },
                "allTime": {
                    "transactions": len(transactions),
                    "sent": all_time_sent,
                    "received": all_time_received,
                    "fees": all_time_fees
                }
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Erreur récupération stats pour {user_id}: {e}")
            return {
                "wallet": {
                    "available": 0.0,
                    "locked": 0.0,
                    "total": 0.0,
                    "address": "",
                    "kycStatus": "none"
                },
                "today": {"sent": 0.0, "received": 0.0},
                "monthly": {"sent": 0.0, "received": 0.0},
                "allTime": {"transactions": 0, "sent": 0.0, "received": 0.0, "fees": 0.0}
            }
    
    def register_user_wallet_on_chain(self, user_id: str) -> str:
        """Enregistrer un wallet utilisateur sur la blockchain"""
        wallet = self.get_user_wallet(user_id)
        
        # Vérifier si le wallet est déjà enregistré
        if wallet.get("exists_on_chain", False):
            return f"Wallet déjà enregistré pour l'utilisateur {user_id}"
        
        # Le owner du contrat doit appeler cette fonction
        owner_address = self.token_contract.functions.owner().call()
        owner_address = self.w3.to_checksum_address(owner_address)
        
        # Convertir l'UUID en bytes32
        user_id_bytes32 = self.uuid_to_bytes32(user_id)
        
        # Construire la transaction
        tx = self.token_contract.functions.registerWallet(
            user_id_bytes32,
            wallet["address"]
        ).build_transaction({
            'from': owner_address,
            'gas': 200000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': self.w3.eth.get_transaction_count(owner_address),
        })
        
        # Signer avec la clé privée du owner
        owner_private_key = os.getenv("BLOCKCHAIN_OWNER_PRIVATE_KEY")
        if not owner_private_key:
            raise ValueError("Clé privée du owner non configurée")
        
        # S'assurer que la clé privée commence par 0x
        if not owner_private_key.startswith("0x"):
            owner_private_key = "0x" + owner_private_key
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, owner_private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        # Distribuer les 500 EDUcoins
        self.distribute_initial_tokens(wallet["address"])
        
        return tx_hash.hex()
    
    def distribute_initial_tokens(self, wallet_address: str) -> str:
        """Distribuer 500 EDUcoins à un wallet"""
        try:
            owner_address = self.token_contract.functions.owner().call()
            owner_address = self.w3.to_checksum_address(owner_address)
            
            # Vérifier si l'utilisateur a déjà reçu ses tokens initiaux
            has_initial = self.token_contract.functions.hasInitialBalance(wallet_address).call()
            if has_initial:
                return f"L'utilisateur a déjà reçu ses tokens initiaux"
            
            # Montant initial: 500 EDU
            amount_wei = self.w3.to_wei(600, 'ether')
            
            # Construire la transaction pour mint les tokens
            tx = self.token_contract.functions.mintInitialTokens(
                wallet_address,
                amount_wei
            ).build_transaction({
                'from': owner_address,
                'gas': 100000,
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(owner_address),
            })
            
            # Signer avec la clé privée du owner
            owner_private_key = os.getenv("BLOCKCHAIN_OWNER_PRIVATE_KEY")
            if not owner_private_key:
                raise ValueError("Clé privée du owner non configurée")
            
            # S'assurer que la clé privée commence par 0x
            if not owner_private_key.startswith("0x"):
                owner_private_key = "0x" + owner_private_key
            
            signed_tx = self.w3.eth.account.sign_transaction(tx, owner_private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            return tx_hash.hex()
        except Exception as e:
            logger.error(f"Erreur distribution tokens initiaux: {e}")
            raise
    
    async def initialize_all_users_wallets(self):
        """Initialiser les wallets pour tous les utilisateurs existants et créditer un peu d'ETH pour le gas"""
        try:
            # Récupérer tous les utilisateurs depuis l'auth-service
            response = requests.get(f"{self.auth_service_url}/api/users")
            
            if response.status_code != 200:
                logger.error("Impossible de récupérer les utilisateurs")
                return []
            
            users = response.json().get("data", [])
            results = []

            # Récupérer l'adresse du owner pour envoyer l'ETH
            owner_address = self.token_contract.functions.owner().call()
            owner_address = self.w3.to_checksum_address(owner_address)

            for user in users:
                user_id = user.get("id")
                if user_id:
                    try:
                        # Enregistrer le wallet sur la blockchain
                        tx_hash = self.register_user_wallet_on_chain(user_id)

                        # Récupérer le wallet
                        wallet = self.get_user_wallet(user_id)

                        # Créditer le wallet avec un peu d'ETH pour le gas
                        self.w3.eth.send_transaction({
                            'from': owner_address,
                            'to': wallet["address"],
                            'value': self.w3.to_wei(0.1, 'ether')  # 0.01 ETH
                        })

                        results.append({
                            "user_id": user_id,
                            "email": user.get("email"),
                            "wallet_address": wallet["address"],
                            "transaction_hash": tx_hash,
                            "balance": 600.0  # EDUcoins initiaux
                        })
                        
                        logger.info(f"✅ Wallet initialisé pour {user.get('email')} : {wallet['address']}")

                    except Exception as e:
                        logger.error(f"❌ Erreur pour l'utilisateur {user_id}: {e}")
                        results.append({
                            "user_id": user_id,
                            "error": str(e)
                        })
            
            return results

        except Exception as e:
            logger.error(f"Erreur initialisation wallets: {e}")
            raise

    
    def get_token_balance(self, address: str) -> float:
        """Obtenir le solde en tokens EDU"""
        # Convertir l'adresse en checksum
        address = self.w3.to_checksum_address(address)
        balance_wei = self.token_contract.functions.balanceOf(address).call()
        return self.w3.from_wei(balance_wei, 'ether')
    
    def transfer_tokens(self, from_user_id: str, to_address: str, amount: float, description: str = "") -> Dict:
        """
        Transférer des tokens EDU de manière sécurisée.
        """
        try:
            # Récupérer le wallet de l'expéditeur
            from_wallet = self.get_user_wallet(from_user_id)
            
            # Convertir les adresses
            from_address = self.w3.to_checksum_address(from_wallet["address"])
            
            # Valider l'adresse du destinataire
            if not isinstance(to_address, str):
                raise ValueError("L'adresse du destinataire doit être une chaîne")
            
            if not to_address.startswith("0x"):
                if len(to_address) == 40:
                    to_address = "0x" + to_address
                else:
                    raise ValueError("Adresse du destinataire invalide")
            
            to_address = self.w3.to_checksum_address(to_address)
            
            if to_address == "0x0000000000000000000000000000000000000000":
                raise ValueError("Adresse du destinataire invalide: adresse zéro")
            
            # Valider la clé privée
            private_key = from_wallet["private_key"].strip()
            if not private_key.startswith("0x"):
                private_key = "0x" + private_key
            
            # Vérifier la longueur
            if len(private_key) != 66:
                raise ValueError("Clé privée invalide")
            
            # Convertir le montant
            amount_wei = self.w3.to_wei(amount, 'ether')
            
            # Vérifier le solde EDU
            balance_wei = self.token_contract.functions.balanceOf(from_address).call()
            if balance_wei < amount_wei:
                raise ValueError(f"Solde insuffisant. Disponible: {self.w3.from_wei(balance_wei, 'ether')} EDU, Requis: {amount} EDU")
            
            # ✅ CRÉDITER UN PEU D'ETH SI NÉCESSAIRE
            eth_balance = self.w3.eth.get_balance(from_address)
            gas_price = self.w3.eth.gas_price
            gas_needed = gas_price * 150000  # Estimation généreuse
            
            if eth_balance < gas_needed:
                logger.info(f"Crédit de 0.05 ETH pour le wallet {from_address[:10]}...")
                
                # Récupérer l'adresse du owner
                owner_address = self.token_contract.functions.owner().call()
                owner_address = self.w3.to_checksum_address(owner_address)
                
                # Envoyer 0.05 ETH (suffisant pour plusieurs transactions)
                transfer_eth_tx = {
                    'from': owner_address,
                    'to': from_address,
                    'value': self.w3.to_wei(0.05, 'ether'),
                    'gas': 21000,
                    'gasPrice': gas_price,
                    'nonce': self.w3.eth.get_transaction_count(owner_address),
                }
                
                # Signer avec la clé privée du owner
                owner_private_key = os.getenv("BLOCKCHAIN_OWNER_PRIVATE_KEY", "").strip()
                if not owner_private_key:
                    raise ValueError("Clé privée du owner non configurée")
                if not owner_private_key.startswith("0x"):
                    owner_private_key = "0x" + owner_private_key
                
                signed_eth_tx = self.w3.eth.account.sign_transaction(transfer_eth_tx, owner_private_key)
                eth_tx_hash = self.w3.eth.send_raw_transaction(signed_eth_tx.rawTransaction)
                self.w3.eth.wait_for_transaction_receipt(eth_tx_hash, timeout=30)
                
                logger.info(f"✅ 0.05 ETH envoyés. Tx: {eth_tx_hash.hex()}")
            
            # Maintenant procéder au transfert de tokens
            gas_price = self.w3.eth.gas_price
            
            # ✅ CORRECTION: Utiliser transferWithDescription pour éviter la surcharge
            tx = self.token_contract.functions.transferWithDescription(
                to_address,
                amount_wei,
                description
            ).build_transaction({
                'from': from_address,
                'gas': 100000,
                'gasPrice': gas_price,
                'nonce': self.w3.eth.get_transaction_count(from_address),
            })
            
            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Attendre la confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
            
            return {
                "transaction_hash": tx_hash.hex(),
                "from": from_address,
                "to": to_address,
                "amount": amount,
                "description": description,
                "block_number": receipt.blockNumber,
                "status": "success" if receipt.status == 1 else "failed",
                "gas_used": receipt.gasUsed
            }
        
        except ValueError as e:
            raise
        except Exception as e:
            logger.error(f"Erreur lors du transfert: {e}")
            raise ValueError(f"Erreur lors du transfert: {str(e)}")
    
    def create_booking(self, student_user_id: str, tutor_user_id: str,
                      amount: float, start_timestamp: int, duration: int,
                      description: str, frontend_booking_id: str) -> Dict:
        """Créer une réservation avec escrow - 100% on-chain"""
        student_wallet = self.get_user_wallet(student_user_id)
        tutor_wallet = self.get_user_wallet(tutor_user_id)
        
        # Convertir amount en wei
        amount_wei = self.w3.to_wei(amount, 'ether')
        
        # Convertir frontend_booking_id en bytes32
        frontend_id_bytes32 = self.uuid_to_bytes32(frontend_booking_id)
        
        # 1. Approver le contrat escrow pour dépenser les tokens
        nonce = self.w3.eth.get_transaction_count(student_wallet["address"])
        approve_tx = self.token_contract.functions.approve(
            self.escrow_address,
            amount_wei
        ).build_transaction({
            'from': student_wallet["address"],
            'gas': 100000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': nonce,
        })
        
        signed_approve_tx = self.w3.eth.account.sign_transaction(approve_tx, student_wallet["private_key"])
        approve_hash = self.w3.eth.send_raw_transaction(signed_approve_tx.rawTransaction)
        approve_receipt = self.w3.eth.wait_for_transaction_receipt(approve_hash, timeout=30)
        logger.info(f"[BLOCKCHAIN] Approve TX status: {approve_receipt.status} (1=success, 0=failed)")
        if approve_receipt.status != 1:
            raise ValueError(f"Approve transaction failed: {approve_hash.hex()}")
        
        # 2. Créer la réservation sur le contrat escrow
        booking_tx = self.escrow_contract.functions.createBooking(
            tutor_wallet["address"],
            amount_wei,
            start_timestamp,
            duration,
            description,
            frontend_id_bytes32
        ).build_transaction({
            'from': student_wallet["address"],
            'gas': 800000,  # Augmenté pour gérer string storage + transferFrom + struct
            'gasPrice': self.w3.eth.gas_price,
            'nonce': nonce + 1,
        })
        
        signed_booking_tx = self.w3.eth.account.sign_transaction(booking_tx, student_wallet["private_key"])
        booking_hash = self.w3.eth.send_raw_transaction(signed_booking_tx.rawTransaction)
        booking_receipt = self.w3.eth.wait_for_transaction_receipt(booking_hash, timeout=30)
        logger.info(f"[BLOCKCHAIN] Booking TX status: {booking_receipt.status} (1=success, 0=failed)")
        logger.info(f"[BLOCKCHAIN] Booking TX gas used: {booking_receipt.gasUsed}")
        if booking_receipt.status != 1:
            raise ValueError(f"Booking creation transaction failed: {booking_hash.hex()}")
        
        # Extraire l'ID de la réservation depuis les événements
        booking_id = None
        logger.info(f"[BLOCKCHAIN] Receipt logs count: {len(booking_receipt.logs)}")
        
        for log in booking_receipt.logs:
            try:
                event = self.escrow_contract.events.BookingCreated().process_log(log)
                booking_id = event.args.bookingId
                logger.info(f"[BLOCKCHAIN] BookingCreated event found: ID={booking_id}")
                break
            except Exception as e:
                logger.debug(f"[BLOCKCHAIN] Log parsing error: {str(e)}")
                continue
        
        if booking_id is None:
            # Fallback: récupérer le dernier booking ID
            booking_count = self.escrow_contract.functions.getBookingCount().call()
            logger.warning(f"[BLOCKCHAIN] No event found, using fallback. Booking count: {booking_count}")
            booking_id = booking_count - 1
        
        return {
            "booking_id": booking_id,
            "frontend_id": frontend_booking_id,
            "transaction_hash": booking_hash.hex(),
            "student": student_wallet["address"],
            "tutor": tutor_wallet["address"],
            "amount": amount,
            "block_number": booking_receipt.blockNumber,
            "status": "PENDING"
        }
    
    def get_booking_status(self, booking_id: int) -> Dict:
        """Récupérer le statut d'une réservation depuis la blockchain"""
        try:
            booking_data = self.escrow_contract.functions.getBooking(booking_id).call()
            
            status_map = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "DISPUTED"]
            outcome_map = ["NOT_DECIDED", "COURSE_HELD", "COURSE_NOT_HELD"]
            
            return {
                "id": booking_data[0],
                "student": booking_data[1],
                "tutor": booking_data[2],
                "amount": float(self.w3.from_wei(booking_data[3], 'ether')),
                "start_time": booking_data[4],
                "duration": booking_data[5],
                "status": status_map[booking_data[6]] if booking_data[6] < len(status_map) else "UNKNOWN",
                "outcome": outcome_map[booking_data[7]] if booking_data[7] < len(outcome_map) else "UNKNOWN",
                "created_at": booking_data[8],
                "student_confirmed": booking_data[9],
                "tutor_confirmed": booking_data[10],
                "description": booking_data[11],
                "frontend_id": booking_data[12].hex()
            }
        except Exception as e:
            logger.error(f"Erreur récupération booking {booking_id}: {e}")
            raise ValueError(f"Réservation {booking_id} non trouvée")
    
    def confirm_booking(self, booking_id: int, tutor_user_id: str) -> Dict:
        """Confirmer une réservation (tutor)"""
        tutor_wallet = self.get_user_wallet(tutor_user_id)
        
        tx = self.escrow_contract.functions.confirmBooking(booking_id).build_transaction({
            'from': tutor_wallet["address"],
            'gas': 200000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': self.w3.eth.get_transaction_count(tutor_wallet["address"]),
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, tutor_wallet["private_key"])
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            "booking_id": booking_id,
            "transaction_hash": tx_hash.hex(),
            "status": "CONFIRMED",
            "block_number": receipt.blockNumber
        }
    
    def reject_booking(self, booking_id: int, tutor_user_id: str) -> Dict:
        """Rejeter une réservation (tutor)"""
        tutor_wallet = self.get_user_wallet(tutor_user_id)
        
        tx = self.escrow_contract.functions.rejectBooking(booking_id).build_transaction({
            'from': tutor_wallet["address"],
            'gas': 200000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': self.w3.eth.get_transaction_count(tutor_wallet["address"]),
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, tutor_wallet["private_key"])
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            "booking_id": booking_id,
            "transaction_hash": tx_hash.hex(),
            "status": "CANCELLED",
            "block_number": receipt.blockNumber
        }
    
    def confirm_course_outcome(self, booking_id: int, user_id: str, course_held: bool) -> Dict:
        """Confirmer l'issue d'un cours"""
        user_wallet = self.get_user_wallet(user_id)
        
        tx = self.escrow_contract.functions.confirmCourseOutcome(
            booking_id,
            course_held
        ).build_transaction({
            'from': user_wallet["address"],
            'gas': 200000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': self.w3.eth.get_transaction_count(user_wallet["address"]),
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, user_wallet["private_key"])
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            "booking_id": booking_id,
            "transaction_hash": tx_hash.hex(),
            "course_held": course_held,
            "block_number": receipt.blockNumber
        }

# Instance globale
blockchain_manager = BlockchainManager()