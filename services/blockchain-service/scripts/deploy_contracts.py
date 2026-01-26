#!/usr/bin/env python3
"""
Script pour compiler et déployer les contrats EduToken et BookingEscrow
Version pure blockchain - sans base de données
"""

import json
import os
import sys
import time
from pathlib import Path
from web3 import Web3
from solcx import compile_source, install_solc

# Configuration
GANACHE_URL = "http://127.0.0.1:8545"
OWNER_PRIVATE_KEY = "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"  # Ganache account 0
OWNER_ADDRESS = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"  # Corresponding address

def compile_contracts():
    """Compiler les contrats Solidity ensemble"""
    print("Compilation des contrats...")
    
    # Installer le compilateur si nécessaire
    install_solc("0.8.19")
    
    # Chemin des contrats
    contracts_dir = Path(__file__).parent.parent / "contracts"
    
    # Lire le fichier source combiné
    with open(contracts_dir / "combined.sol", "r") as f:
        full_source = f.read()
    
    # Compiler les deux contrats ENSEMBLE avec viaIR pour éviter "stack too deep"
    print("Compilation des contrats (ensemble)...")
    compiled = compile_source(
        full_source,
        solc_version="0.8.19",
        output_values=["abi", "bin"],
        optimize=True,
        optimize_runs=200,
        via_ir=True  # <-- CORRECTION: Activer viaIR pour résoudre "stack too deep"
    )
    
    # Récupérer les contrats compilés
    edu_token_interface = compiled["<stdin>:EduToken"]
    booking_escrow_interface = compiled["<stdin>:BookingEscrow"]
    
    edu_token_bytecode = edu_token_interface['bin']
    edu_token_abi = edu_token_interface['abi']
    booking_escrow_bytecode = booking_escrow_interface['bin']
    booking_escrow_abi = booking_escrow_interface['abi']
    
    print("[OK] Contrats compilés avec succès")
    
    return {
        "EduToken": {
            "bytecode": edu_token_bytecode,
            "abi": edu_token_abi
        },
        "BookingEscrow": {
            "bytecode": booking_escrow_bytecode,
            "abi": booking_escrow_abi
        }
    }

def deploy_contracts(compiled_contracts):
    """Déployer les contrats sur Ganache"""
    print("\nConnexion à Ganache...")
    
    # CORRECTION: Timeout raisonnable de 25 secondes (compromis)
    w3 = Web3(Web3.HTTPProvider(
        GANACHE_URL,
        request_kwargs={"timeout": 25}  # <-- TIMEOUT ajusté à 25s
    ))
    
    if not w3.is_connected():
        print("[ERREUR] Impossible de se connecter à Ganache")
        return None
    
    print(f"[OK] Connecté à Ganache (block #{w3.eth.block_number})")
    
    # Préparer le compte owner
    account = w3.eth.account.from_key(OWNER_PRIVATE_KEY)
    print(f"Compte owner: {account.address}")
    print(f"Balance: {w3.from_wei(w3.eth.get_balance(account.address), 'ether')} ETH")
    
    # Déployer EduToken
    print("\n[INFO] Déploiement de EduToken...")
    
    edu_token_contract = w3.eth.contract(
        abi=compiled_contracts["EduToken"]["abi"],
        bytecode=compiled_contracts["EduToken"]["bytecode"]
    )
    
    # CORRECTION: Gas ajusté à 4.5 millions (réaliste)
    nonce = w3.eth.get_transaction_count(account.address)
    gas_price = w3.eth.gas_price
    
    # Construire la transaction avec gas ajusté
    tx = edu_token_contract.constructor().build_transaction({
        'from': account.address,
        'gas': 4_500_000,  # <-- Gas ajusté à 4.5M
        'gasPrice': gas_price,
        'nonce': nonce,
    })
    
    # Signer et envoyer
    signed_tx = w3.eth.account.sign_transaction(tx, OWNER_PRIVATE_KEY)
    
    try:
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    except Exception as e:
        print(f"[ERREUR] Envoi transaction échoué: {e}")
        return None
    
    # CORRECTION: Timeout d'attente ajusté
    print(f"   Transaction envoyée: {tx_hash.hex()}")
    print("   Attente de confirmation... (cela peut prendre quelques secondes)")
    
    try:
        tx_receipt = w3.eth.wait_for_transaction_receipt(
            tx_hash, 
            timeout=30,  # <-- Timeout ajusté à 30s
            poll_latency=2
        )
    except Exception as e:
        print(f"[ERREUR] Timeout transaction: {e}")
        return None
    
    edu_token_address = tx_receipt.contractAddress
    
    print(f"[OK] EduToken déployé à: {edu_token_address}")
    print(f"   Gas utilisé: {tx_receipt.gasUsed}")
    
    # Attendre un peu pour être sûr
    time.sleep(1)
    
    # Déployer BookingEscrow (qui a besoin de l'adresse d'EduToken)
    print("\n[INFO] Déploiement de BookingEscrow...")
    
    booking_escrow_contract = w3.eth.contract(
        abi=compiled_contracts["BookingEscrow"]["abi"],
        bytecode=compiled_contracts["BookingEscrow"]["bytecode"]
    )
    
    # Construire la transaction avec l'adresse d'EduToken en paramètre
    nonce += 1  # Incrémenter le nonce
    tx = booking_escrow_contract.constructor(edu_token_address).build_transaction({
        'from': account.address,
        'gas': 4_000_000,  # <-- Gas ajusté pour BookingEscrow
        'gasPrice': gas_price,
        'nonce': nonce,
    })
    
    # Signer et envoyer
    signed_tx = w3.eth.account.sign_transaction(tx, OWNER_PRIVATE_KEY)
    
    try:
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    except Exception as e:
        print(f"[ERREUR] Envoi transaction BookingEscrow échoué: {e}")
        return None
    
    print(f"   Transaction envoyée: {tx_hash.hex()}")
    print("   Attente de confirmation...")
    
    try:
        tx_receipt = w3.eth.wait_for_transaction_receipt(
            tx_hash, 
            timeout=30,  # <-- Timeout ajusté
            poll_latency=2
        )
    except Exception as e:
        print(f"[ERREUR] Timeout transaction BookingEscrow: {e}")
        return None
    
    booking_escrow_address = tx_receipt.contractAddress
    
    print(f"[OK] BookingEscrow déployé à: {booking_escrow_address}")
    print(f"   Gas utilisé: {tx_receipt.gasUsed}")
    
    return {
        "edu_token": edu_token_address,
        "booking_escrow": booking_escrow_address
    }

def save_env_file(contract_addresses):
    """Sauvegarder les adresses dans un fichier .env"""
    print("\n[INFO] Sauvegarde des adresses...")
    
    env_content = f"""# Blockchain Configuration
BLOCKCHAIN_PROVIDER_URL=http://127.0.0.1:8545
EDU_TOKEN_ADDRESS={contract_addresses['edu_token']}
BOOKING_ESCROW_ADDRESS={contract_addresses['booking_escrow']}
BLOCKCHAIN_OWNER_PRIVATE_KEY={OWNER_PRIVATE_KEY}

# Authentication Service
AUTH_SERVICE_URL=http://localhost:3001

# Service Configuration
PORT=3003
ENVIRONMENT=development
"""
    
    env_path = Path(__file__).parent.parent / ".env"
    
    with open(env_path, "w") as f:
        f.write(env_content)
    
    print(f"[OK] Fichier .env mis à jour: {env_path}")
    
    # Afficher les adresses pour copier-coller
    print("\n[INFO] Adresses des contrats:")
    print(f"EDU_TOKEN_ADDRESS={contract_addresses['edu_token']}")
    print(f"BOOKING_ESCROW_ADDRESS={contract_addresses['booking_escrow']}")

def verify_deployment(w3, contract_addresses, compiled_contracts):
    """Vérifier que les contrats sont bien déployés"""
    print("\n[INFO] Vérification du déploiement...")
    
    try:
        # Vérifier EduToken
        edu_token = w3.eth.contract(
            address=contract_addresses['edu_token'],
            abi=compiled_contracts["EduToken"]["abi"]
        )
        
        name = edu_token.functions.name().call()
        symbol = edu_token.functions.symbol().call()
        total_supply = w3.from_wei(edu_token.functions.totalSupply().call(), 'ether')
        owner_address = edu_token.functions.owner().call()
        
        print(f"[INFO] {name} ({symbol})")
        print(f"   Total supply: {total_supply} EDU")
        print(f"   Owner: {owner_address}")
        print(f"   Owner balance: {w3.from_wei(edu_token.functions.balanceOf(owner_address).call(), 'ether')} EDU")
        
        # Vérifier BookingEscrow
        booking_escrow = w3.eth.contract(
            address=contract_addresses['booking_escrow'],
            abi=compiled_contracts["BookingEscrow"]["abi"]
        )
        
        token_address = booking_escrow.functions.token().call()
        booking_count = booking_escrow.functions.getBookingCount().call()
        
        print(f"\n[INFO] BookingEscrow")
        print(f"   Token: {token_address}")
        print(f"   Bookings: {booking_count}")
        
        # Vérifier que les adresses correspondent
        if token_address.lower() == contract_addresses['edu_token'].lower():
            print("   [OK] Adresse du token vérifiée")
        else:
            print("   [ERREUR] Adresse du token incorrecte!")
        
        return True
        
    except Exception as e:
        print(f"[ERREUR] Erreur vérification: {e}")
        return False

def main():
    """Fonction principale - point d'entrée quand exécuté directement"""
    print("=" * 60)
    print("DÉPLOIEMENT DES CONTRATS BLOCKCHAIN EDUCOIN")
    print("=" * 60)
    
    try:
        # 1. Compiler les contrats
        compiled_contracts = compile_contracts()
        
        # 2. Déployer les contrats
        contract_addresses = deploy_contracts(compiled_contracts)
        
        if not contract_addresses:
            print("[ERREUR] Échec du déploiement")
            return None
        
        # 3. Se reconnecter pour les opérations suivantes
        w3 = Web3(Web3.HTTPProvider(GANACHE_URL))
        
        # 4. Vérifier le déploiement
        if verify_deployment(w3, contract_addresses, compiled_contracts):
            print("\n[OK] Vérification réussie!")
        
        # 5. Sauvegarder les adresses
        save_env_file(contract_addresses)
        
        print("\n" + "=" * 60)
        print("[OK] DÉPLOIEMENT RÉUSSI!")
        print("=" * 60)
        
        print("\nProchaines étapes:")
        print("1. Démarrer le service blockchain: python -m uvicorn app.main:app")
        print("2. Vérifier l'API: http://localhost:3003/docs")
        print("3. Tester avec: curl http://localhost:3003/health")
        
        return contract_addresses
        
    except Exception as e:
        print("\n[ERREUR SOLIDITY / DEPLOY]")
        print(str(e))
        import traceback
        traceback.print_exc()
        return None

# Point d'entrée quand exécuté directement
if __name__ == "__main__":
    main()