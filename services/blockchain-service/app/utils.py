# app/utils.py
import hashlib
import hmac
from typing import Tuple
from eth_account import Account
from web3 import Web3

class DeterministicWallet:
    """Génération déterministe de wallets depuis userId"""
    
    def __init__(self, master_secret: bytes = b"edumate-blockchain-master-secret-2024"):
        self.master_secret = master_secret
    
    def derive_from_user_id(self, user_id: str) -> Tuple[str, str]:
        """
        Dérive une paire de clés Ethereum déterministe depuis un userId
        Même userId → même clé privée → même adresse
        """
        # HMAC avec le master_secret pour garantir la déterminisme
        seed = hmac.new(
            self.master_secret,
            user_id.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        # La seed devient la clé privée
        private_key = seed.hex()
        
        # Créer le compte
        account = Account.from_key(private_key)
        
        return private_key, account.address
    
    def derive_from_private_key(self, private_key: str) -> str:
        """Obtenir l'adresse depuis une clé privée"""
        account = Account.from_key(private_key)
        return account.address

# Singleton
wallet_deriver = DeterministicWallet()