#!/usr/bin/env python3
import asyncio
import requests
import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from services.blockchain_service.app.blockchain import blockchain_manager

async def initialize_wallets_for_all_users():
    """Script pour initialiser manuellement les wallets pour tous les utilisateurs"""
    print("🚀 Initialisation des wallets pour tous les utilisateurs...")
    
    try:
        results = await blockchain_manager.initialize_all_users_wallets()
        
        print(f"\n✅ Initialisation terminée!")
        print(f"📊 Résultats:")
        print(f"   • Total: {len(results)} utilisateurs")
        
        success = [r for r in results if "error" not in r]
        errors = [r for r in results if "error" in r]
        
        print(f"   • Succès: {len(success)}")
        print(f"   • Erreurs: {len(errors)}")
        
        if success:
            print(f"\n🎉 Wallets créés avec succès:")
            for r in success[:10]:  # Afficher les 10 premiers
                print(f"   • {r.get('email')}: {r.get('wallet_address')} - 500 EDU")
            
            if len(success) > 10:
                print(f"   ... et {len(success) - 10} autres")
        
        if errors:
            print(f"\n⚠️ Erreurs:")
            for r in errors[:5]:
                print(f"   • User {r.get('user_id')}: {r.get('error')}")
            
            if len(errors) > 5:
                print(f"   ... et {len(errors) - 5} autres erreurs")
        
        # Sauvegarder les résultats
        with open("wallets_initialization.json", "w") as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📁 Résultats sauvegardés dans: wallets_initialization.json")
        
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(initialize_wallets_for_all_users())