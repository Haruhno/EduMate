from web3 import Web3, HTTPProvider
from web3.middleware import ExtraDataToPOAMiddleware
from eth_account import Account
from eth_account.messages import encode_defunct
import hashlib
import hmac
import os
import uuid
import time
import json
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
        
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        self.auth_service_url = auth_service_url
        
        # Charger les contrats depuis l'environnement
        self.load_contracts_from_env()
        
        # Générateur de wallets déterministes
        self.wallet_generator = DeterministicWalletGenerator()
        
        # ⚡ CACHE pour les stats (éviter recalcul à chaque appel)
        self._stats_cache = {}
        self._stats_cache_timestamp = {}
        self._stats_cache_ttl = 30  # 30 secondes
        
        # ⚡ CACHE pour l'historique des transactions
        self._history_cache = {}
        self._history_cache_timestamp = {}
        self._history_cache_ttl = 15  # 15 secondes (plus court car plus dynamique)
        
        # ⚡ CACHE pour les infos wallet (éviter requêtes HTTP répétées)
        self._wallet_info_cache = {}
        self._wallet_info_cache_timestamp = {}
        self._wallet_info_cache_ttl = 60  # 60 secondes (les users changent rarement de nom)
        
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
        self.skill_exchange_address = os.getenv("SKILL_EXCHANGE_ADDRESS")
        
        if not self.token_address or not self.escrow_address or not self.skill_exchange_address:
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
        
        self.skill_exchange_abi = [
            {"constant": False, "inputs": [{"name": "studentId", "type": "bytes32"}, {"name": "tutorId", "type": "bytes32"}, {"name": "skillOffered", "type": "string"}, {"name": "skillRequested", "type": "string"}, {"name": "frontendId", "type": "bytes32"}], "name": "createExchange", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
            {"constant": False, "inputs": [{"name": "exchangeId", "type": "uint256"}, {"name": "tutorId", "type": "bytes32"}], "name": "acceptExchange", "outputs": [], "type": "function"},
            {"constant": False, "inputs": [{"name": "exchangeId", "type": "uint256"}, {"name": "tutorId", "type": "bytes32"}], "name": "rejectExchange", "outputs": [], "type": "function"},
            {"constant": False, "inputs": [{"name": "exchangeId", "type": "uint256"}], "name": "completeExchange", "outputs": [], "type": "function"},
            {"constant": True, "inputs": [{"name": "exchangeId", "type": "uint256"}], "name": "getExchange", "outputs": [{"name": "studentId", "type": "bytes32"}, {"name": "tutorId", "type": "bytes32"}, {"name": "skillOffered", "type": "string"}, {"name": "skillRequested", "type": "string"}, {"name": "status", "type": "uint8"}, {"name": "createdAt", "type": "uint256"}, {"name": "frontendId", "type": "bytes32"}], "type": "function"},
            {"constant": True, "inputs": [{"name": "frontendId", "type": "bytes32"}], "name": "getExchangeByFrontendId", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
            {"constant": True, "inputs": [], "name": "getExchangeCount", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
            {"anonymous": False, "inputs": [
                {"indexed": True, "name": "exchangeId", "type": "uint256"},
                {"indexed": True, "name": "studentId", "type": "bytes32"},
                {"indexed": True, "name": "tutorId", "type": "bytes32"},
                {"indexed": False, "name": "skillOffered", "type": "string"},
                {"indexed": False, "name": "skillRequested", "type": "string"},
                {"indexed": False, "name": "timestamp", "type": "uint256"},
                {"indexed": False, "name": "frontendId", "type": "bytes32"}
            ], "name": "ExchangeCreated", "type": "event"},
            {"anonymous": False, "inputs": [
                {"indexed": True, "name": "exchangeId", "type": "uint256"},
                {"indexed": False, "name": "tutorId", "type": "bytes32"},
                {"indexed": False, "name": "timestamp", "type": "uint256"}
            ], "name": "ExchangeAccepted", "type": "event"},
            {"anonymous": False, "inputs": [
                {"indexed": True, "name": "exchangeId", "type": "uint256"},
                {"indexed": False, "name": "tutorId", "type": "bytes32"},
                {"indexed": False, "name": "timestamp", "type": "uint256"}
            ], "name": "ExchangeRejected", "type": "event"},
            {"anonymous": False, "inputs": [
                {"indexed": True, "name": "exchangeId", "type": "uint256"},
                {"indexed": False, "name": "timestamp", "type": "uint256"}
            ], "name": "ExchangeCompleted", "type": "event"}
        ]
        
        # Convertir les adresses en checksum
        self.token_address = self.w3.to_checksum_address(self.token_address)
        self.escrow_address = self.w3.to_checksum_address(self.escrow_address)
        self.skill_exchange_address = self.w3.to_checksum_address(self.skill_exchange_address)
        
        self.token_contract = self.w3.eth.contract(
            address=self.token_address,
            abi=self.token_abi
        )
        
        self.escrow_contract = self.w3.eth.contract(
            address=self.escrow_address,
            abi=self.escrow_abi
        )
        
        self.skill_exchange_contract = self.w3.eth.contract(
            address=self.skill_exchange_address,
            abi=self.skill_exchange_abi
        )
    
    def get_transaction_history(self, user_wallet_address: str, limit: int = 20, include_wallet_info: bool = True) -> List[Dict]:
        """
        Récupère l'historique des transactions depuis la blockchain
        en utilisant get_logs (méthode fiable pour Ganache)
        Récupère DEUX types d'événements:
        1. EduTransfer (transferts avec description)
        2. Transfer standard (transferFrom utilisé par les bookings)
        
        Args:
            include_wallet_info: Si False, ne pas appeler _get_wallet_info_sync (gain de performance)
        
        ⚡ OPTIMISATION: Cache de 15 secondes pour éviter les scans répétés
        """
        try:
            wallet_address = self.w3.to_checksum_address(user_wallet_address)
            
            # ⚡ Créer une clé de cache unique
            cache_key = f"{wallet_address}:{limit}:{include_wallet_info}"
            
            # ⚡ Vérifier le cache d'abord
            now = time.time()
            if cache_key in self._history_cache:
                cache_age = now - self._history_cache_timestamp.get(cache_key, 0)
                if cache_age < self._history_cache_ttl:
                    logger.info(f"⚡ [CACHE] Historique servi depuis le cache pour {wallet_address[:8]}... (âge: {cache_age:.1f}s)")
                    return self._history_cache[cache_key]
            
            logger.info(f"⏱️ [HISTORY] Scan blockchain pour {wallet_address[:8]}... (limit={limit})")
            start_time = time.time()
            
            # Obtenir l'adresse du owner pour filtrer les initialisations
            owner_address = self.token_contract.functions.owner().call()
            
            # Format pour les topics
            address_hash_from = f'0x{wallet_address[2:].rjust(64, "0")}'
            address_hash_to = address_hash_from
            
            transactions = []
            
            try:
                # ============ ÉVÉNEMENTS EduTransfer (custom avec description) ============
                # ⚠️ Ne PAS utiliser .hex() - Ganache requiert le préfixe "0x"
                edu_event_signature = self.w3.keccak(text="EduTransfer(address,address,uint256,string,uint256)")
                
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
                # ⚠️ Ne PAS utiliser .hex() - Ganache requiert le préfixe "0x"
                transfer_event_signature = self.w3.keccak(text="Transfer(address,address,uint256)")
                
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
                        # ⚠️ Comparer en bytes car edu_event_signature est maintenant en bytes
                        is_edu_transfer = log['topics'][0] == edu_event_signature
                        
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
                            
                            # ⚠️ FILTRER les transferts provenant de l'escrow (déjà affichés comme bookings)
                            # Quand les deux parties confirment leurs avis, l'escrow libère les fonds au tuteur
                            # Ce transfert escrow→tuteur crée un événement Transfer qui apparaît en double
                            # dans l'historique (une fois comme booking, une fois comme transfer)
                            escrow_checksum = self.w3.to_checksum_address(self.escrow_address)
                            if from_address == escrow_checksum:
                                logger.debug(f"🔕 [FILTRÉ] Transfer escrow→{to_address[:10]}... (déjà affiché comme booking)")
                                continue
                            
                            # Description par défaut
                            description = "Transfert de tokens"
                        
                        # Enrichir les métadonnées pour les bookings
                        metadata = {}
                        booking_status = "completed"  # Statut par défaut
                        
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
                                    booking_blockchain_status = booking[6]  # Index du statut: 0=PENDING, 1=CONFIRMED, 2=FAILED, 3=CANCELLED
                                    
                                    if booking_student == event['args']['from'] and abs(booking_amount - amount) < 0.01:
                                        # Utiliser la description du booking depuis la blockchain
                                        description = booking_description
                                        
                                        # Déterminer le statut réel de la transaction basé sur le statut du booking
                                        # 0 = PENDING → transaction pending (argent bloqué)
                                        # 1 = CONFIRMED → transaction pending (toujours en attente de confirmation du cours)
                                        # 2 = FAILED ou 3 = CANCELLED → transaction cancelled
                                        if booking_blockchain_status == 0:
                                            booking_status = "pending"  # Réservation en attente
                                        elif booking_blockchain_status == 1:
                                            booking_status = "pending"  # Confirmée mais cours pas encore validé
                                        elif booking_blockchain_status == 2 or booking_blockchain_status == 3:
                                            booking_status = "cancelled"
                                        else:
                                            booking_status = "completed"  # Autres cas
                                        
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
                            "status": booking_status,  # Utiliser le statut réel du booking
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
                        
                        # Si c'est une réservation (booking), créer aussi une transaction "entrante" pour le tuteur
                        if event['args']['to'] == self.escrow_address and metadata:
                            # Transaction "entrante" pour le tuteur (en pending, car elle sera complétée après la validation du cours)
                            tutor_transaction = {
                                "id": (log['transactionHash'].hex()[:32] + "_tutor")[-32:],  # ID unique pour le tuteur
                                "fromWalletId": event['args']['from'],  # L'étudiant
                                "toWalletId": metadata.get('tutorId'),  # L'ID du tuteur (user ID, pas wallet)
                                "amount": amount,
                                "fee": 0.0,
                                "transactionType": "BOOKING",
                                "status": "pending",  # Toujours pending pour le tuteur jusqu'à validation du cours
                                "description": description,
                                "metadata": metadata,
                                "createdAt": datetime.fromtimestamp(block['timestamp']).isoformat(),
                                "fromWallet": self._get_wallet_info_sync(event['args']['from']),
                                "toWallet": None,  # On ne peut pas récupérer le wallet du tuteur depuis juste l'ID
                                "ledgerBlock": {
                                    "id": log['blockNumber'],
                                    "hash": block['hash'].hex(),
                                    "timestamp": block['timestamp']
                                }
                            }
                            transactions.append(tutor_transaction)
                        
                    except Exception as e:
                        logger.warning(f"Erreur traitement log: {e}")
                        continue
                        
            except Exception as e:
                logger.error(f"Erreur récupération logs: {e}")
            
            # ============ AJOUTER LES TRANSACTIONS ENTRANTES POUR LES TUTEURS ============
            # Si l'utilisateur est un tuteur, ajouter les transactions entrantes pour ses bookings
            try:
                # Récupérer le userId de cet utilisateur depuis la blockchain
                user_id_bytes = self.token_contract.functions.getUserId(wallet_address).call()
                user_id = self.bytes32_to_uuid(user_id_bytes)
                
                if user_id:
                    # Récupérer tous les bookings où cet utilisateur est tuteur
                    tutor_bookings = self.get_tutor_bookings(user_id)
                    
                    # Pour chaque booking, créer une transaction entrante si elle n'existe pas déjà
                    existing_booking_ids = set()
                    for tx in transactions:
                        if tx.get('metadata', {}).get('bookingId'):
                            existing_booking_ids.add(tx['metadata']['bookingId'])
                    
                    for booking in tutor_bookings:
                        booking_id = booking.get('blockchainId')
                        
                        # Si cette transaction n'existe pas déjà, la créer
                        if booking_id not in existing_booking_ids:
                            # Récupérer les détails du booking depuis la blockchain
                            blockchain_booking = self.escrow_contract.functions.getBooking(booking_id).call()
                            student_address = blockchain_booking[1]
                            amount = blockchain_booking[3] / 10**18
                            created_at = blockchain_booking[8]
                            booking_status = blockchain_booking[6]
                            description = blockchain_booking[11] if len(blockchain_booking) > 11 else "Réservation de cours"
                            
                            # Déterminer le statut de la transaction
                            transaction_status = "completed"
                            if booking_status == 0 or booking_status == 1:
                                transaction_status = "pending"
                            elif booking_status == 2:
                                transaction_status = "cancelled"
                            
                            # Récupérer les infos du tuteur depuis auth-service
                            tutor_name = "Tuteur"
                            try:
                                tutor_resp = requests.get(
                                    f"{self.auth_service_url}/api/users/{user_id}",
                                    timeout=5
                                )
                                if tutor_resp.status_code == 200:
                                    tutor_data = tutor_resp.json().get("data", {})
                                    tutor_name = f"{tutor_data.get('firstName', 'Tuteur')} {tutor_data.get('lastName', '')}"
                            except:
                                pass
                            
                            # Créer la transaction entrante pour le tuteur
                            tutor_transaction = {
                                "id": f"booking_{booking_id}_tutor",
                                "fromWalletId": student_address,
                                "toWalletId": user_id,
                                "amount": amount,
                                "fee": 0.0,
                                "transactionType": "BOOKING",
                                "status": transaction_status,
                                "description": description,
                                "metadata": {
                                    "bookingId": booking_id,
                                    "tutorId": user_id,
                                    "tutorName": tutor_name,
                                    "studentId": booking.get('studentId'),
                                    "annonceId": booking.get('annonceId'),
                                    "startTime": booking.get('startTime'),
                                    "duration": booking.get('duration')
                                },
                                "createdAt": datetime.fromtimestamp(created_at).isoformat(),
                                "fromWallet": self._get_wallet_info_sync(student_address),
                                "toWallet": None,
                                "ledgerBlock": None
                            }
                            transactions.append(tutor_transaction)
            except Exception as e:
                logger.warning(f"Erreur ajout transactions tuteur: {e}")
            
            # ============ AJOUTER LES TRANSACTIONS SKILL EXCHANGE ============
            try:
                # Récupérer le userId de cet utilisateur depuis la blockchain
                user_id_bytes = self.token_contract.functions.getUserId(wallet_address).call()
                user_id = self.bytes32_to_uuid(user_id_bytes)
                
                if user_id:
                    # Récupérer tous les skill exchanges où cet utilisateur est impliqué
                    skill_exchanges = self.get_user_skill_exchanges(user_id)
                    
                    for exchange in skill_exchanges:
                        try:
                            exchange_id = exchange.get("id")
                            student_id = exchange.get("studentId")
                            tutor_id = exchange.get("tutorId")
                            status = exchange.get("status")
                            created_at = exchange.get("createdAt")
                            frontend_id = exchange.get("frontendId")
                            
                            # Créer une transaction pour chaque skill exchange (même si 0 EDU)
                            # C'est une transaction virtuelle pour affichage (type: SKILL_EXCHANGE)
                            transaction = {
                                "id": f"skill_exchange_{exchange_id}_{created_at}",
                                "fromWalletId": student_id,  # ID utilisateur
                                "toWalletId": tutor_id,      # ID utilisateur
                                "amount": 0.0,  # Les skill exchanges sont gratuits
                                "fee": 0.0,
                                "transactionType": "SKILL_EXCHANGE",
                                "status": "pending" if status in ["PENDING", "ACCEPTED"] else "completed",
                                "description": f"Échange de compétences",
                                "metadata": {
                                    "exchangeId": exchange_id,
                                    "studentId": student_id,
                                    "tutorId": tutor_id,
                                    "skillOffered": exchange.get("skillOffered"),
                                    "skillRequested": exchange.get("skillRequested"),
                                    "status": status,
                                    "frontendId": frontend_id
                                },
                                "createdAt": exchange.get("createdAtIso") or datetime.fromtimestamp(created_at).isoformat() if isinstance(created_at, (int, float)) else str(created_at),
                                "fromWallet": None,
                                "toWallet": None,
                                "ledgerBlock": None
                            }
                            transactions.append(transaction)
                            
                        except Exception as ex:
                            logger.warning(f"Erreur ajout skill exchange {exchange.get('id')}: {ex}")
                            continue
            except Exception as e:
                logger.warning(f"Erreur ajout transactions skill exchange: {e}")
            
            # ⚡ Mettre en cache
            self._history_cache[cache_key] = transactions
            self._history_cache_timestamp[cache_key] = time.time()
            
            elapsed = (time.time() - start_time) * 1000
            logger.info(f"✅ [HISTORY] {len(transactions)} transactions récupérées en {elapsed:.0f}ms")
            
            return transactions
            
        except Exception as e:
            logger.error(f"Erreur récupération historique pour {user_wallet_address}: {e}")
            return []
    
    def _get_wallet_info_sync(self, wallet_address: str) -> Dict:
        """
        Récupère les infos utilisateur depuis l'auth-service pour une adresse wallet (sync)
        ⚡ OPTIMISATION: Cache de 60 secondes pour éviter requêtes HTTP répétées
        """
        try:
            # ⚡ Vérifier le cache d'abord
            if wallet_address in self._wallet_info_cache:
                cache_age = time.time() - self._wallet_info_cache_timestamp.get(wallet_address, 0)
                if cache_age < self._wallet_info_cache_ttl:
                    return self._wallet_info_cache[wallet_address]
            
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
                        result = {
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
                        # ⚡ Mettre en cache le résultat réussi
                        self._wallet_info_cache[wallet_address] = result
                        self._wallet_info_cache_timestamp[wallet_address] = time.time()
                        return result
            except Exception as e:
                logger.debug(f"Impossible de normaliser l'userId pour {wallet_address}: {e}")
            
            # Fallback: juste l'adresse
            result = {
                "id": wallet_address,
                "walletAddress": wallet_address,
                "user": None
            }
            # ⚡ Mettre en cache même les fallback
            self._wallet_info_cache[wallet_address] = result
            self._wallet_info_cache_timestamp[wallet_address] = time.time()
            return result
        except:
            result = {
                "id": wallet_address,
                "walletAddress": wallet_address,
                "user": None
            }
            self._wallet_info_cache[wallet_address] = result
            self._wallet_info_cache_timestamp[wallet_address] = time.time()
            return result
    
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
        """Récupérer les statistiques détaillées depuis la blockchain
        
        Les statistiques ne doivent compter QUE les transactions réelles de l'utilisateur :
        - Pour l'étudiant : les transactions sortantes (vers l'escrow)
        - Pour le tuteur : les transactions entrantes (depuis l'escrow après validation)
        - Ne PAS compter les transactions virtuelles créées pour affichage
        
        ⚡ OPTIMISATION: Cache de 30 secondes + limit réduit à 50 transactions
        """
        try:
            # ⚡ Vérifier le cache d'abord
            now = time.time()
            if user_id in self._stats_cache:
                cache_age = now - self._stats_cache_timestamp.get(user_id, 0)
                if cache_age < self._stats_cache_ttl:
                    logger.info(f"⚡ [CACHE] Stats servies depuis le cache pour {user_id} (âge: {cache_age:.1f}s)")
                    return self._stats_cache[user_id]
            
            logger.info(f"⏱️ [STATS] Calcul des stats pour {user_id}...")
            start_time = time.time()
            
            wallet = self.get_user_wallet(user_id)
            address = wallet["address"]
            
            # Récupérer le solde
            available_balance = self.get_token_balance(address)
            
            # ⚡ OPTIMISATION: Réduire le limit à 20 (pareil que les transactions pour scan plus rapide)
            # Les stats mensuelles nécessitent rarement 50+ transactions
            # ⚡ OPTIMISATION: include_wallet_info=False car on n'a besoin que des montants
            transactions = self.get_transaction_history(address, limit=20, include_wallet_info=False)
            
            # FILTRER les transactions virtuelles (celles créées pour affichage uniquement)
            # Exclure les transactions avec id contenant '_tutor' ou commençant par 'booking_'
            real_transactions = [
                tx for tx in transactions 
                if not (tx.get('id', '').endswith('_tutor') or tx.get('id', '').startswith('booking_'))
            ]
            
            # Calculer les stats
            today_sent = 0.0
            today_received = 0.0
            monthly_sent = 0.0
            monthly_received = 0.0
            all_time_sent = 0.0
            all_time_received = 0.0
            all_time_fees = 0.0
            transaction_count = 0  # Compter uniquement les transactions qui concernent l'utilisateur
            
            today = datetime.now().date()
            current_month = datetime.now().month
            current_year = datetime.now().year
            
            for tx in real_transactions:
                try:
                    tx_date = datetime.fromisoformat(tx["createdAt"].replace('Z', '+00:00'))
                    amount = tx["amount"]
                    
                    # Ne compter la transaction qu'UNE SEULE FOIS (soit entrante, soit sortante)
                    if tx["fromWalletId"] == address:
                        # Transaction sortante
                        transaction_count += 1
                        all_time_sent += amount
                        
                        if tx_date.date() == today:
                            today_sent += amount
                        
                        if tx_date.month == current_month and tx_date.year == current_year:
                            monthly_sent += amount
                            
                    elif tx["toWalletId"] == address:
                        # Transaction entrante
                        transaction_count += 1
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
                    "transactions": transaction_count,  # ⚡ Compter uniquement les transactions de l'utilisateur
                    "sent": all_time_sent,
                    "received": all_time_received,
                    "fees": all_time_fees
                }
            }
            
            # ⚡ Mettre en cache
            self._stats_cache[user_id] = stats
            self._stats_cache_timestamp[user_id] = time.time()
            
            elapsed = (time.time() - start_time) * 1000
            logger.info(f"✅ [STATS] Stats calculées en {elapsed:.0f}ms pour {user_id}")
            
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
        
        # ✅ CORRECTION: Convertir l'adresse en checksum format
        wallet_address = self.w3.to_checksum_address(wallet["address"])
        
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
            wallet_address
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
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        # Distribuer les 500 EDUcoins
        self.distribute_initial_tokens(wallet["address"])
        
        return tx_hash.hex()
    
    def distribute_initial_tokens(self, wallet_address: str) -> str:
        """Distribuer 500 EDUcoins à un wallet"""
        try:
            # ✅ CORRECTION: Convertir l'adresse en checksum format
            wallet_address = self.w3.to_checksum_address(wallet_address)
            
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
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
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

            # Utiliser le 1er compte Ganache qui a de l'ETH
            ganache_account_0_address = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"
            ganache_account_0_key = "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
            owner_address = self.w3.to_checksum_address(ganache_account_0_address)

            for user in users:
                user_id = user.get("id")
                if user_id:
                    try:
                        # Enregistrer le wallet sur la blockchain
                        tx_hash = self.register_user_wallet_on_chain(user_id)

                        # Récupérer le wallet
                        wallet = self.get_user_wallet(user_id)

                        # Créditer le wallet avec ETH pour le gas (0.5 ETH = plein)
                        wallet_address = self.w3.to_checksum_address(wallet["address"])
                        nonce = self.w3.eth.get_transaction_count(owner_address)
                        
                        tx = {
                            'from': owner_address,
                            'to': wallet_address,
                            'value': self.w3.to_wei(0.5, 'ether'),
                            'gas': 21000,
                            'gasPrice': self.w3.eth.gas_price,
                            'nonce': nonce
                        }
                        
                        signed = self.w3.eth.account.sign_transaction(tx, ganache_account_0_key)
                        tx_receipt = self.w3.eth.send_raw_transaction(signed.raw_transaction)
                        self.w3.eth.wait_for_transaction_receipt(tx_receipt)

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
                eth_tx_hash = self.w3.eth.send_raw_transaction(signed_eth_tx.raw_transaction)
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
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
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
        
        # ✅ CORRECTION: Convertir les adresses en checksum format
        student_address = self.w3.to_checksum_address(student_wallet["address"])
        tutor_address = self.w3.to_checksum_address(tutor_wallet["address"])
        
        # Convertir amount en wei
        amount_wei = self.w3.to_wei(amount, 'ether')
        
        # Convertir frontend_booking_id en bytes32
        frontend_id_bytes32 = self.uuid_to_bytes32(frontend_booking_id)
        
        # 1. Approver le contrat escrow pour dépenser les tokens
        nonce = self.w3.eth.get_transaction_count(student_address)
        logger.info(f"[BLOCKCHAIN] Student nonce initial: {nonce}")
        
        approve_tx = self.token_contract.functions.approve(
            self.escrow_address,
            amount_wei
        ).build_transaction({
            'from': student_address,
            'gas': 100000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': nonce,
        })
        
        signed_approve_tx = self.w3.eth.account.sign_transaction(approve_tx, student_wallet["private_key"])
        approve_hash = self.w3.eth.send_raw_transaction(signed_approve_tx.raw_transaction)
        logger.info(f"[BLOCKCHAIN] Approve TX sent: {approve_hash.hex()}")
        
        approve_receipt = self.w3.eth.wait_for_transaction_receipt(approve_hash, timeout=30)
        logger.info(f"[BLOCKCHAIN] Approve TX status: {approve_receipt.status} (1=success, 0=failed)")
        logger.info(f"[BLOCKCHAIN] Approve TX gas used: {approve_receipt.gasUsed}")
        if approve_receipt.status != 1:
            raise ValueError(f"Approve transaction failed: {approve_hash.hex()}")
        
        # 2. Créer la réservation sur le contrat escrow
        # ⚠️ IMPORTANT: Le nonce doit être incrémenté car la TX précédente est confirmée
        nonce_for_booking = nonce + 1
        logger.info(f"[BLOCKCHAIN] Creating booking with nonce: {nonce_for_booking}")
        
        booking_tx = self.escrow_contract.functions.createBooking(
            tutor_address,
            amount_wei,
            start_timestamp,
            duration,
            description,
            frontend_id_bytes32
        ).build_transaction({
            'from': student_address,
            'gas': 800000,  # Augmenté pour gérer string storage + transferFrom + struct
            'gasPrice': self.w3.eth.gas_price,
            'nonce': nonce_for_booking,
        })
        
        signed_booking_tx = self.w3.eth.account.sign_transaction(booking_tx, student_wallet["private_key"])
        booking_hash = self.w3.eth.send_raw_transaction(signed_booking_tx.raw_transaction)
        logger.info(f"[BLOCKCHAIN] Booking TX sent: {booking_hash.hex()}")
        
        booking_receipt = self.w3.eth.wait_for_transaction_receipt(booking_hash, timeout=30)
        logger.info(f"[BLOCKCHAIN] Booking TX status: {booking_receipt.status} (1=success, 0=failed)")
        logger.info(f"[BLOCKCHAIN] Booking TX gas used: {booking_receipt.gasUsed}")
        if booking_receipt.status != 1:
            # Diagnostiquer la raison de l'échec
            error_reason = "Transaction échouée"
            if booking_receipt.gasUsed < 50000:
                error_reason = "Le créneau est probablement dans le passé ou les conditions du contrat ne sont pas remplies"
            raise ValueError(f"Erreur blockchain: {error_reason}. TX: {booking_hash.hex()}")
        
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
        
        # ✅ CORRECTION: Convertir l'adresse en checksum format
        tutor_address = self.w3.to_checksum_address(tutor_wallet["address"])
        
        tx = self.escrow_contract.functions.confirmBooking(booking_id).build_transaction({
            'from': tutor_address,
            'gas': 200000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': self.w3.eth.get_transaction_count(tutor_address),
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, tutor_wallet["private_key"])
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
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
        
        # ✅ CORRECTION: Convertir l'adresse en checksum format
        tutor_address = self.w3.to_checksum_address(tutor_wallet["address"])
        
        tx = self.escrow_contract.functions.rejectBooking(booking_id).build_transaction({
            'from': tutor_address,
            'gas': 200000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': self.w3.eth.get_transaction_count(tutor_address),
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, tutor_wallet["private_key"])
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
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
        
        # ✅ CORRECTION: Convertir l'adresse en checksum format
        user_address = self.w3.to_checksum_address(user_wallet["address"])
        
        tx = self.escrow_contract.functions.confirmCourseOutcome(
            booking_id,
            course_held
        ).build_transaction({
            'from': user_address,
            'gas': 200000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': self.w3.eth.get_transaction_count(user_address),
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, user_wallet["private_key"])
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            "booking_id": booking_id,
            "transaction_hash": tx_hash.hex(),
            "course_held": course_held,
            "block_number": receipt.blockNumber
        }
    
    def get_tutor_bookings(self, tutor_user_id: str) -> List[Dict]:
        """Récupérer toutes les réservations pour un tuteur (100% on-chain)"""
        tutor_wallet = self.get_user_wallet(tutor_user_id)
        tutor_address = self.w3.to_checksum_address(tutor_wallet["address"])
        
        bookings = []
        
        try:
            # Récupérer le nombre total de réservations
            booking_count = self.escrow_contract.functions.getBookingCount().call()
            logger.info(f"[GET_TUTOR_BOOKINGS] Total bookings in contract: {booking_count}")
            
            # Parcourir toutes les réservations et filtrer pour ce tuteur
            for booking_id in range(booking_count):
                try:
                    # Récupérer la réservation
                    booking_data = self.escrow_contract.functions.getBooking(booking_id).call()
                    
                    # Unpack les données
                    (
                        id_,
                        student,
                        tutor,
                        amount,
                        start_time,
                        duration,
                        status,
                        outcome,
                        created_at,
                        student_confirmed,
                        tutor_confirmed,
                        description,
                        frontend_id
                    ) = booking_data
                    
                    # Vérifier si ce tuteur correspond
                    if self.w3.to_checksum_address(tutor) == tutor_address:
                        logger.info(f"[GET_TUTOR_BOOKINGS] Booking {booking_id} is for this tutor")
                        
                        # Convertir le frontend_id en UUID
                        frontend_id_str = self.bytes32_to_uuid(frontend_id) or frontend_id.hex()
                        
                        # Mapper le statut
                        status_map = {0: "PENDING", 1: "CONFIRMED", 2: "CANCELLED", 3: "COMPLETED", 4: "DISPUTED"}
                        
                        booking_dict = {
                            "id": frontend_id_str,
                            "blockchainId": booking_id,
                            "studentAddress": student,
                            "tutorAddress": tutor,
                            "amount": float(self.w3.from_wei(amount, 'ether')),
                            "startTime": start_time,
                            "duration": duration,
                            "status": status_map.get(status, "UNKNOWN"),
                            "outcome": outcome,
                            "createdAt": created_at,
                            "studentConfirmed": student_confirmed,
                            "tutorConfirmed": tutor_confirmed,
                            "description": description,
                            "frontendId": frontend_id_str
                        }
                        
                        bookings.append(booking_dict)
                        
                except Exception as e:
                    logger.debug(f"[GET_TUTOR_BOOKINGS] Error reading booking {booking_id}: {e}")
                    continue
            
            logger.info(f"[GET_TUTOR_BOOKINGS] Found {len(bookings)} bookings for tutor {tutor_user_id}")
            return bookings
            
        except Exception as e:
            logger.error(f"[GET_TUTOR_BOOKINGS] Error retrieving tutor bookings: {e}")
            raise

    def get_student_bookings(self, student_user_id: str) -> List[Dict]:
        """Récupérer toutes les réservations pour un étudiant (100% on-chain)"""
        student_wallet = self.get_user_wallet(student_user_id)
        student_address = self.w3.to_checksum_address(student_wallet["address"])
        
        bookings = []
        
        try:
            # Récupérer le nombre total de réservations
            booking_count = self.escrow_contract.functions.getBookingCount().call()
            logger.info(f"[GET_STUDENT_BOOKINGS] Total bookings in contract: {booking_count}")
            
            # Parcourir toutes les réservations et filtrer pour cet étudiant
            for booking_id in range(booking_count):
                try:
                    # Récupérer la réservation
                    booking_data = self.escrow_contract.functions.getBooking(booking_id).call()
                    
                    # Unpack les données
                    (
                        id_,
                        student,
                        tutor,
                        amount,
                        start_time,
                        duration,
                        status,
                        outcome,
                        created_at,
                        student_confirmed,
                        tutor_confirmed,
                        description,
                        frontend_id
                    ) = booking_data
                    
                    # Vérifier si cet étudiant correspond
                    if self.w3.to_checksum_address(student) == student_address:
                        logger.info(f"[GET_STUDENT_BOOKINGS] Booking {booking_id} is for this student")
                        
                        # Convertir le frontend_id en UUID
                        frontend_id_str = self.bytes32_to_uuid(frontend_id) or frontend_id.hex()
                        
                        # Mapper le statut
                        status_map = {0: "PENDING", 1: "CONFIRMED", 2: "CANCELLED", 3: "COMPLETED", 4: "DISPUTED"}
                        
                        booking_dict = {
                            "id": frontend_id_str,
                            "blockchainId": booking_id,
                            "studentAddress": student,
                            "tutorAddress": tutor,
                            "amount": float(self.w3.from_wei(amount, 'ether')),
                            "startTime": start_time,
                            "duration": duration,
                            "status": status_map.get(status, "UNKNOWN"),
                            "outcome": outcome,
                            "createdAt": created_at,
                            "studentConfirmed": student_confirmed,
                            "tutorConfirmed": tutor_confirmed,
                            "description": description,
                            "frontendId": frontend_id_str
                        }
                        
                        bookings.append(booking_dict)
                        
                except Exception as e:
                    logger.debug(f"[GET_STUDENT_BOOKINGS] Error reading booking {booking_id}: {e}")
                    continue
            
            logger.info(f"[GET_STUDENT_BOOKINGS] Found {len(bookings)} bookings for student {student_user_id}")
            return bookings
            
        except Exception as e:
            logger.error(f"[GET_STUDENT_BOOKINGS] Error retrieving student bookings: {e}")
            raise
    
    # ===================== SKILL EXCHANGE METHODS =====================
    
    def create_skill_exchange(
        self, 
        student_user_id: str, 
        tutor_user_id: str,
        skill_offered: str,  # JSON string
        skill_requested: str,  # JSON string
        frontend_exchange_id: str
    ) -> Dict:
        """Créer une demande d'échange de compétence sur la blockchain"""
        try:
            logger.info(f"[CREATE_SKILL_EXCHANGE] Student: {student_user_id}, Tutor: {tutor_user_id}")
            
            # Obtenir les wallets
            student_wallet = self.get_user_wallet(student_user_id)
            tutor_wallet = self.get_user_wallet(tutor_user_id)
            
            student_address = student_wallet["address"]
            tutor_address = tutor_wallet["address"]
            student_private_key = student_wallet["private_key"]
            
            # Convertir les userId en bytes32
            student_id_bytes32 = self.uuid_to_bytes32(student_user_id)
            tutor_id_bytes32 = self.uuid_to_bytes32(tutor_user_id)
            frontend_id_bytes32 = self.uuid_to_bytes32(frontend_exchange_id)
            
            # Créer la transaction
            nonce = self.w3.eth.get_transaction_count(student_address)
            
            logger.info(f"[CREATE_SKILL_EXCHANGE] studentId (bytes32): {student_id_bytes32.hex()}")
            logger.info(f"[CREATE_SKILL_EXCHANGE] tutorId (bytes32): {tutor_id_bytes32.hex()}")
            logger.info(f"[CREATE_SKILL_EXCHANGE] frontendId (bytes32): {frontend_id_bytes32.hex()}")
            
            try:
                estimated_gas = self.skill_exchange_contract.functions.createExchange(
                    student_id_bytes32,
                    tutor_id_bytes32,
                    skill_offered,
                    skill_requested,
                    frontend_id_bytes32
                ).estimate_gas({'from': student_address})
                gas_limit = int(estimated_gas * 1.2) + 50000
            except Exception as gas_error:
                logger.warning(f"[CREATE_SKILL_EXCHANGE] Gas estimation failed: {gas_error}")
                gas_limit = 800000

            transaction = self.skill_exchange_contract.functions.createExchange(
                student_id_bytes32,
                tutor_id_bytes32,
                skill_offered,
                skill_requested,
                frontend_id_bytes32
            ).build_transaction({
                'from': student_address,
                'nonce': nonce,
                'gas': gas_limit,
                'gasPrice': self.w3.eth.gas_price
            })
            
            # Signer et envoyer
            signed_txn = self.w3.eth.account.sign_transaction(transaction, student_private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)
            logger.info(f"[CREATE_SKILL_EXCHANGE] Transaction sent: {tx_hash.hex()}")
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            logger.info(f"[CREATE_SKILL_EXCHANGE] Receipt status: {receipt['status']}, Gas used: {receipt['gasUsed']}")
            if receipt['status'] != 1:
                logger.error(f"[CREATE_SKILL_EXCHANGE] Transaction failed with status {receipt['status']}")
                logger.error(f"[CREATE_SKILL_EXCHANGE] Student: {student_address}, Tutor: {tutor_address}")
                logger.error(f"[CREATE_SKILL_EXCHANGE] Skill offered: {skill_offered}")
                logger.error(f"[CREATE_SKILL_EXCHANGE] Skill requested: {skill_requested}")
                
                # Try to get the revert reason by simulating the call
                try:
                    logger.info(f"[CREATE_SKILL_EXCHANGE] Attempting to simulate transaction to get revert reason...")
                    result = self.skill_exchange_contract.functions.createExchange(
                        student_id_bytes32,
                        tutor_id_bytes32,
                        skill_offered,
                        skill_requested,
                        frontend_id_bytes32
                    ).call({'from': student_address})
                    logger.info(f"[CREATE_SKILL_EXCHANGE] Call succeeded unexpectedly: {result}")
                except Exception as call_error:
                    error_msg = str(call_error)
                    logger.error(f"[CREATE_SKILL_EXCHANGE] Simulated call error: {error_msg}")
                    if "revert" in error_msg.lower():
                        logger.error(f"[CREATE_SKILL_EXCHANGE] Contract revert reason: {error_msg}")
                
                raise Exception(f"Transaction failed with status {receipt['status']}")
            
            # Récupérer l'ID de l'échange depuis l'événement
            exchange_id = self.skill_exchange_contract.functions.getExchangeByFrontendId(
                frontend_id_bytes32
            ).call()
            
            logger.info(f"[CREATE_SKILL_EXCHANGE] Exchange créé avec ID: {exchange_id}")
            
            # Créer une transaction +0 -0 pour l'historique
            try:
                self.transfer_tokens(
                    from_user_id=student_user_id,
                    to_address=student_address,  # À soi-même
                    amount=0.0,
                    description=f"Skill Exchange Request: {json.loads(skill_requested)['name']}"
                )
            except Exception as e:
                logger.warning(f"[CREATE_SKILL_EXCHANGE] Could not create history transaction: {e}")
            
            return {
                "exchangeId": exchange_id,
                "frontendId": frontend_exchange_id,
                "transactionHash": tx_hash.hex(),
                "studentId": student_user_id,
                "tutorId": tutor_user_id,
                "skillOffered": skill_offered,
                "skillRequested": skill_requested,
                "status": "PENDING"
            }
            
        except Exception as e:
            logger.error(f"[CREATE_SKILL_EXCHANGE] Error: {e}")
            raise
    
    def accept_skill_exchange(self, exchange_id: int, tutor_user_id: str) -> Dict:
        """Accepter un échange de compétence"""
        try:
            logger.info(f"[ACCEPT_SKILL_EXCHANGE] Exchange ID: {exchange_id}, Tutor: {tutor_user_id}")
            
            tutor_wallet = self.get_user_wallet(tutor_user_id)
            tutor_address = tutor_wallet["address"]
            tutor_private_key = tutor_wallet["private_key"]
            tutor_id_bytes32 = self.uuid_to_bytes32(tutor_user_id)
            
            nonce = self.w3.eth.get_transaction_count(tutor_address)
            
            transaction = self.skill_exchange_contract.functions.acceptExchange(
                exchange_id,
                tutor_id_bytes32
            ).build_transaction({
                'from': tutor_address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            signed_txn = self.w3.eth.account.sign_transaction(transaction, tutor_private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt['status'] != 1:
                raise Exception("Transaction failed")
            
            logger.info(f"[ACCEPT_SKILL_EXCHANGE] Exchange {exchange_id} accepted")
            
            return {
                "exchangeId": exchange_id,
                "status": "ACCEPTED",
                "transactionHash": tx_hash.hex()
            }
            
        except Exception as e:
            logger.error(f"[ACCEPT_SKILL_EXCHANGE] Error: {e}")
            raise
    
    def reject_skill_exchange(self, exchange_id: int, tutor_user_id: str) -> Dict:
        """Rejeter un échange de compétence"""
        try:
            logger.info(f"[REJECT_SKILL_EXCHANGE] Exchange ID: {exchange_id}, Tutor: {tutor_user_id}")
            
            tutor_wallet = self.get_user_wallet(tutor_user_id)
            tutor_address = tutor_wallet["address"]
            tutor_private_key = tutor_wallet["private_key"]
            tutor_id_bytes32 = self.uuid_to_bytes32(tutor_user_id)
            
            nonce = self.w3.eth.get_transaction_count(tutor_address)
            
            transaction = self.skill_exchange_contract.functions.rejectExchange(
                exchange_id,
                tutor_id_bytes32
            ).build_transaction({
                'from': tutor_address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            signed_txn = self.w3.eth.account.sign_transaction(transaction, tutor_private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt['status'] != 1:
                raise Exception("Transaction failed")
            
            logger.info(f"[REJECT_SKILL_EXCHANGE] Exchange {exchange_id} rejected")
            
            return {
                "exchangeId": exchange_id,
                "status": "REJECTED",
                "transactionHash": tx_hash.hex()
            }
            
        except Exception as e:
            logger.error(f"[REJECT_SKILL_EXCHANGE] Error: {e}")
            raise
    
    def complete_skill_exchange(self, exchange_id: int, user_id: str) -> Dict:
        """Compléter un échange de compétence"""
        try:
            logger.info(f"[COMPLETE_SKILL_EXCHANGE] Exchange ID: {exchange_id}, User: {user_id}")
            
            user_wallet = self.get_user_wallet(user_id)
            user_address = user_wallet["address"]
            user_private_key = user_wallet["private_key"]
            
            nonce = self.w3.eth.get_transaction_count(user_address)
            
            transaction = self.skill_exchange_contract.functions.completeExchange(
                exchange_id
            ).build_transaction({
                'from': user_address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            signed_txn = self.w3.eth.account.sign_transaction(transaction, user_private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt['status'] != 1:
                raise Exception("Transaction failed")
            
            logger.info(f"[COMPLETE_SKILL_EXCHANGE] Exchange {exchange_id} completed")
            
            return {
                "exchangeId": exchange_id,
                "status": "COMPLETED",
                "transactionHash": tx_hash.hex()
            }
            
        except Exception as e:
            logger.error(f"[COMPLETE_SKILL_EXCHANGE] Error: {e}")
            raise
    
    def get_skill_exchange(self, exchange_id: int) -> Dict:
        """Récupérer les détails d'un échange"""
        try:
            exchange_data = self.skill_exchange_contract.functions.getExchange(exchange_id).call()
            
            (
                student_id_bytes32,
                tutor_id_bytes32,
                skill_offered,
                skill_requested,
                status,
                created_at,
                frontend_id_bytes32
            ) = exchange_data
            
            # Convertir bytes32 en UUID
            student_id = self.bytes32_to_uuid(student_id_bytes32)
            tutor_id = self.bytes32_to_uuid(tutor_id_bytes32)
            frontend_id = self.bytes32_to_uuid(frontend_id_bytes32)
            
            status_map = {0: "PENDING", 1: "ACCEPTED", 2: "REJECTED", 3: "COMPLETED"}
            
            return {
                "id": exchange_id,
                "studentId": student_id,
                "tutorId": tutor_id,
                "skillOffered": skill_offered,
                "skillRequested": skill_requested,
                "status": status_map.get(status, "UNKNOWN"),
                "createdAt": created_at,
                "frontendId": frontend_id
            }
            
        except Exception as e:
            logger.error(f"[GET_SKILL_EXCHANGE] Error: {e}")
            raise
    
    def get_user_skill_exchanges(self, user_id: str) -> List[Dict]:
        """Récupérer tous les échanges d'un utilisateur (as student or tutor)"""
        try:
            logger.info(f"[GET_USER_SKILL_EXCHANGES] User: {user_id}")
            
            user_id_bytes32 = self.uuid_to_bytes32(user_id)
            exchanges = []
            
            # Récupérer le nombre total d'échanges
            exchange_count = self.skill_exchange_contract.functions.getExchangeCount().call()
            logger.info(f"[GET_USER_SKILL_EXCHANGES] Total exchanges in contract: {exchange_count}")
            
            # Parcourir tous les échanges
            for exchange_id in range(1, exchange_count + 1):
                try:
                    exchange_data = self.skill_exchange_contract.functions.getExchange(exchange_id).call()
                    
                    (
                        student_id_bytes32,
                        tutor_id_bytes32,
                        skill_offered,
                        skill_requested,
                        status,
                        created_at,
                        frontend_id_bytes32
                    ) = exchange_data
                    
                    # Vérifier si cet utilisateur est impliqué
                    if student_id_bytes32 == user_id_bytes32 or tutor_id_bytes32 == user_id_bytes32:
                        student_id = self.bytes32_to_uuid(student_id_bytes32)
                        tutor_id = self.bytes32_to_uuid(tutor_id_bytes32)
                        frontend_id = self.bytes32_to_uuid(frontend_id_bytes32)
                        
                        status_map = {0: "PENDING", 1: "ACCEPTED", 2: "REJECTED", 3: "COMPLETED"}
                        
                        exchanges.append({
                            "id": exchange_id,
                            "studentId": student_id,
                            "tutorId": tutor_id,
                            "skillOffered": skill_offered,
                            "skillRequested": skill_requested,
                            "status": status_map.get(status, "UNKNOWN"),
                            "createdAt": created_at,
                            "frontendId": frontend_id
                        })
                        
                except Exception as e:
                    logger.debug(f"[GET_USER_SKILL_EXCHANGES] Error reading exchange {exchange_id}: {e}")
                    continue
            
            logger.info(f"[GET_USER_SKILL_EXCHANGES] Found {len(exchanges)} exchanges for user {user_id}")
            return exchanges
            
        except Exception as e:
            logger.error(f"[GET_USER_SKILL_EXCHANGES] Error: {e}")
            raise

# Instance globale
blockchain_manager = BlockchainManager()