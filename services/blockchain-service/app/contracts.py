# app/contracts.py
from .blockchain import blockchain_manager
from typing import Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ContractManager:
    """Manager pour interagir avec les contrats intelligents"""
    
    def __init__(self):
        self.w3 = blockchain_manager.w3
        self.token_contract = blockchain_manager.token_contract
        self.escrow_contract = blockchain_manager.escrow_contract
        
    # Méthodes pour EduToken
    def get_token_balance(self, address: str) -> float:
        """Obtenir le solde en tokens EDU"""
        balance_wei = self.token_contract.functions.balanceOf(address).call()
        return self.w3.from_wei(balance_wei, 'ether')
    
    def transfer_tokens(self, from_address: str, to_address: str, 
                       amount: float, private_key: str) -> Dict:
        """Transférer des tokens EDU"""
        amount_wei = self.w3.to_wei(amount, 'ether')
        
        # Vérifier l'approbation si nécessaire
        allowance = self.token_contract.functions.allowance(
            from_address, 
            to_address
        ).call()
        
        if allowance < amount_wei:
            # Approuver le transfert
            approve_tx = self.token_contract.functions.approve(
                to_address,
                amount_wei
            ).build_transaction({
                'from': from_address,
                'gas': 100000,
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(from_address),
            })
            
            signed_approve = self.w3.eth.account.sign_transaction(approve_tx, private_key)
            approve_hash = self.w3.eth.send_raw_transaction(signed_approve.rawTransaction)
            self.w3.eth.wait_for_transaction_receipt(approve_hash)
        
        # Effectuer le transfert
        transfer_tx = self.token_contract.functions.transfer(
            to_address,
            amount_wei
        ).build_transaction({
            'from': from_address,
            'gas': 100000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': self.w3.eth.get_transaction_count(from_address) + 1,
        })
        
        signed_transfer = self.w3.eth.account.sign_transaction(transfer_tx, private_key)
        transfer_hash = self.w3.eth.send_raw_transaction(signed_transfer.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(transfer_hash)
        
        return {
            "hash": transfer_hash.hex(),
            "from": from_address,
            "to": to_address,
            "amount": amount,
            "status": "success" if receipt.status == 1 else "failed",
            "block": receipt.blockNumber
        }
    
    # Méthodes pour BookingEscrow
    def get_booking_status_name(self, status_code: int) -> str:
        """Convertir le code de statut en nom"""
        status_map = {
            0: "PENDING",
            1: "CONFIRMED",
            2: "CANCELLED",
            3: "COMPLETED",
            4: "DISPUTED"
        }
        return status_map.get(status_code, "UNKNOWN")
    
    def get_outcome_name(self, outcome_code: int) -> str:
        """Convertir le code d'outcome en nom"""
        outcome_map = {
            0: "NOT_DECIDED",
            1: "COURSE_HELD",
            2: "COURSE_NOT_HELD"
        }
        return outcome_map.get(outcome_code, "UNKNOWN")
    
    def format_booking(self, booking_data: tuple, escrow_data: tuple) -> Dict:
        """Formatter les données de réservation depuis la blockchain"""
        return {
            "id": booking_data[0],
            "student_address": booking_data[1],
            "tutor_address": booking_data[2],
            "amount": self.w3.from_wei(booking_data[3], 'ether'),
            "start_time": booking_data[4],
            "duration": booking_data[5],
            "status": self.get_booking_status_name(booking_data[6]),
            "outcome": self.get_outcome_name(booking_data[7]),
            "created_at": booking_data[8],
            "student_confirmed": booking_data[9],
            "tutor_confirmed": booking_data[10],
            "description": booking_data[11],
            "escrow": {
                "amount": self.w3.from_wei(escrow_data[0], 'ether'),
                "funds_locked": escrow_data[1],
                "funds_released": escrow_data[2],
                "locked_at": escrow_data[3],
                "released_at": escrow_data[4]
            }
        }
    
    def get_all_bookings(self) -> List[Dict]:
        """Récupérer toutes les réservations (pour debug)"""
        try:
            booking_count = self.escrow_contract.functions.getBookingCount().call()
            bookings = []
            
            for i in range(1, booking_count + 1):
                try:
                    booking_data = self.escrow_contract.functions.getBooking(i).call()
                    escrow_data = self.escrow_contract.functions.getEscrow(i).call()
                    
                    bookings.append(self.format_booking(booking_data, escrow_data))
                except Exception as e:
                    logger.warning(f"Erreur récupération booking {i}: {e}")
                    continue
            
            return bookings
        except Exception as e:
            logger.error(f"Erreur récupération des bookings: {e}")
            return []
    
    def get_booking_events(self, from_block: int = 0, to_block: str = "latest") -> List[Dict]:
        """Récupérer les événements de réservation"""
        try:
            events = []
            
            # Événement BookingCreated
            created_filter = self.escrow_contract.events.BookingCreated.create_filter(
                fromBlock=from_block,
                toBlock=to_block
            )
            events.extend(created_filter.get_all_entries())
            
            # Événement BookingConfirmed
            confirmed_filter = self.escrow_contract.events.BookingConfirmed.create_filter(
                fromBlock=from_block,
                toBlock=to_block
            )
            events.extend(confirmed_filter.get_all_entries())
            
            # Événement BookingCancelled
            cancelled_filter = self.escrow_contract.events.BookingCancelled.create_filter(
                fromBlock=from_block,
                toBlock=to_block
            )
            events.extend(cancelled_filter.get_all_entries())
            
            # Événement BookingCompleted
            completed_filter = self.escrow_contract.events.BookingCompleted.create_filter(
                fromBlock=from_block,
                toBlock=to_block
            )
            events.extend(completed_filter.get_all_entries())
            
            # Formatter les événements
            formatted_events = []
            for event in events:
                formatted_events.append({
                    "event": event.event,
                    "args": dict(event.args),
                    "block_number": event.blockNumber,
                    "transaction_hash": event.transactionHash.hex(),
                    "log_index": event.logIndex
                })
            
            return formatted_events
        except Exception as e:
            logger.error(f"Erreur récupération événements: {e}")
            return []

# Instance globale
contract_manager = ContractManager()