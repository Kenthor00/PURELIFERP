"""
PURE LIFE OS - Outbox Worker
Pattern Transactional Outbox per Prism Billing
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Callable, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from database import async_session
from models import Outbox, OutboxStatus

logger = logging.getLogger(__name__)


class OutboxWorker:
    def __init__(self):
        self.running = False
        self.adapters: Dict[str, Callable] = {}
        self.base_retry_delay = 60
        self.max_retry_delay = 3600
    
    def register_adapter(self, event_type: str, handler: Callable):
        """Registra un adapter per tipo evento"""
        self.adapters[event_type] = handler
        logger.info(f"Adapter registrato per: {event_type}")
    
    async def process_event(self, event: Outbox, db: AsyncSession) -> bool:
        """Processa singolo evento outbox"""
        handler = self.adapters.get(event.event_type)
        
        if not handler:
            logger.warning(f"Nessun adapter per evento tipo: {event.event_type}")
            return False
        
        try:
            await handler(event.payload)
            
            event.status = OutboxStatus.SENT
            event.processed_at = datetime.now(timezone.utc)
            await db.commit()
            
            logger.info(f"Evento {event.id} processato con successo")
            return True
            
        except Exception as e:
            event.retry_count += 1
            event.last_error = str(e)
            
            if event.retry_count >= event.max_retries:
                event.status = OutboxStatus.FAILED
                logger.error(f"Evento {event.id} fallito definitivamente: {e}")
            else:
                delay = min(
                    self.base_retry_delay * (2 ** event.retry_count),
                    self.max_retry_delay
                )
                event.next_retry_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
                logger.warning(f"Evento {event.id} fallito, retry #{event.retry_count} tra {delay}s: {e}")
            
            await db.commit()
            return False
    
    async def run_once(self):
        """Esegue un ciclo di processing"""
        async with async_session() as db:
            now = datetime.now(timezone.utc)
            
            result = await db.execute(
                select(Outbox).where(
                    Outbox.status == OutboxStatus.PENDING,
                    (Outbox.next_retry_at == None) | (Outbox.next_retry_at <= now)
                ).order_by(Outbox.created_at).limit(10)
            )
            events = result.scalars().all()
            
            for event in events:
                await self.process_event(event, db)
    
    async def start(self, interval: int = 10):
        """Avvia worker loop"""
        self.running = True
        logger.info("Outbox Worker avviato")
        
        while self.running:
            try:
                await self.run_once()
            except Exception as e:
                logger.error(f"Errore nel worker loop: {e}")
            
            await asyncio.sleep(interval)
    
    def stop(self):
        """Ferma worker"""
        self.running = False
        logger.info("Outbox Worker fermato")


outbox_worker = OutboxWorker()


# ==========================================
# PRISM BILLING ADAPTER LAYER
# ==========================================

async def prism_billing_fine_handler(payload: dict):
    """
    Adapter per invio multa a Prism Billing
    DA IMPLEMENTARE con endpoint reali Prism
    """
    logger.info(f"[PRISM ADAPTER] Invio multa: {payload}")
    
    # TODO: Implementare chiamata reale a Prism Billing
    # Esempio struttura:
    # async with httpx.AsyncClient() as client:
    #     response = await client.post(
    #         f"{PRISM_API_URL}/billing/fine",
    #         json=payload,
    #         headers={"Authorization": f"Bearer {PRISM_API_KEY}"}
    #     )
    #     response.raise_for_status()
    
    pass


async def prism_billing_payment_handler(payload: dict):
    """
    Adapter per notifica pagamento a Prism Billing
    DA IMPLEMENTARE con endpoint reali Prism
    """
    logger.info(f"[PRISM ADAPTER] Notifica pagamento: {payload}")
    pass


# Registra adapters
outbox_worker.register_adapter("fine_created", prism_billing_fine_handler)
outbox_worker.register_adapter("payment_received", prism_billing_payment_handler)
