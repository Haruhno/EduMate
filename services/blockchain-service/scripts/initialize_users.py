#!/usr/bin/env python3
"""
Script simple pour initialiser les wallets des utilisateurs existants
Connecte à l'API users et crée un wallet blockchain pour chacun
"""

import requests
import sys
from pathlib import Path

# Ajouter le chemin pour les imports
sys.path.append(str(Path(__file__).parent.parent / "app"))

from blockchain import blockchain_manager

def get_all_users():
    """Récupérer tous les utilisateurs depuis l'API"""
    try:
        response = requests.get("http://localhost:3001/api/users", timeout=10)
        if response.status_code == 200:
            return response.json().get("data", [])
        return []
    except Exception as e:
        print(f"❌ Erreur récupération utilisateurs: {e}")
        return []

def initialize_user_wallets():
    """Initialiser les wallets pour tous les utilisateurs"""
    print("👥 Initialisation des wallets utilisateurs...")
    
    # Récupérer les utilisateurs
    users = get_all_users()
    
    if not users:
        print("⚠️ Aucun utilisateur trouvé")
        return []
    
    print(f"📋 {len(users)} utilisateurs à traiter")
    
    results = []
    
    for user in users:
        user_id = user.get("id")
        if not user_id:
            continue
        
        try:
            print(f"   • {user.get('email')}...", end=" ", flush=True)
            
            # Obtenir ou créer le wallet
            wallet = blockchain_manager.get_user_wallet(user_id)
            
            # Si le wallet n'est pas encore sur la blockchain, l'enregistrer
            if not wallet.get("exists_on_chain", False):
                tx_hash = blockchain_manager.register_user_wallet_on_chain(user_id)
                print(f"✅ créé: {wallet['address'][:10]}...")
            else:
                print(f"✅ existe déjà: {wallet['address'][:10]}...")
            
            # Vérifier le solde
            balance = blockchain_manager.get_token_balance(wallet["address"])
            print(f"(solde: {balance} EDU)")
            
            results.append({
                "user_id": user_id,
                "email": user.get("email"),
                "wallet": wallet["address"],
                "balance": float(balance)
            })
            
        except Exception as e:
            print(f"❌ erreur: {e}")
            results.append({
                "user_id": user_id,
                "error": str(e)
            })
    
    print(f"\n✅ {len([r for r in results if 'error' not in r])} wallets initialisés")
    
    return results

if __name__ == "__main__":
    try:
        initialize_user_wallets()
    except Exception as e:
        print(f"❌ Erreur: {e}")
        sys.exit(1)