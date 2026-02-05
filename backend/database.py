"""
PURE LIFE OS - Database Configuration
MySQL con SQLAlchemy Async
Supporta DATABASE_URL (Railway) o variabili separate
"""
import os
import logging
import re
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from dotenv import load_dotenv
from pathlib import Path
from urllib.parse import urlparse, urlunparse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)


def build_database_url() -> str:
    """
    Costruisce l'URL del database.
    Priorità: DATABASE_URL (Railway) > variabili separate
    Converte mysql:// in mysql+aiomysql:// per async
    """
    database_url = os.environ.get('DATABASE_URL')
    
    if database_url:
        # Railway fornisce mysql:// ma SQLAlchemy async richiede mysql+aiomysql://
        if database_url.startswith('mysql://'):
            database_url = database_url.replace('mysql://', 'mysql+aiomysql://', 1)
        elif database_url.startswith('mysql+pymysql://'):
            database_url = database_url.replace('mysql+pymysql://', 'mysql+aiomysql://', 1)
        elif not database_url.startswith('mysql+aiomysql://'):
            # Se è un altro formato mysql, converti
            database_url = re.sub(r'^mysql(\+\w+)?://', 'mysql+aiomysql://', database_url)
        
        logger.info("Usando DATABASE_URL da ambiente (Railway)")
        return database_url
    
    # Fallback a variabili separate (legacy/local dev)
    mysql_host = os.environ.get('MYSQL_HOST')
    mysql_port = os.environ.get('MYSQL_PORT', '3306')
    mysql_user = os.environ.get('MYSQL_USER')
    mysql_password = os.environ.get('MYSQL_PASSWORD', '')
    mysql_database = os.environ.get('MYSQL_DATABASE', 'purelife_os')
    
    if mysql_host and mysql_user:
        url = f"mysql+aiomysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_database}"
        logger.info(f"Usando variabili MySQL separate (host: {mysql_host})")
        return url
    
    # Nessuna configurazione DB - usa un URL placeholder che fallirà alla connessione
    # Il server si avvierà comunque in stato degradato
    logger.warning("DATABASE_URL non configurata - il server si avvierà in stato degradato")
    return "mysql+aiomysql://placeholder:placeholder@localhost:3306/placeholder"


# Build database URL
DATABASE_URL = build_database_url()

# Crea engine con connection pooling
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=300,  # Recycle connections ogni 5 minuti
    connect_args={
        "connect_timeout": 10
    }
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def check_tables_exist() -> bool:
    """Verifica se le tabelle principali esistono"""
    try:
        async with async_session() as session:
            result = await session.execute(text("SHOW TABLES"))
            tables = [row[0] for row in result.fetchall()]
            required_tables = ['users', 'cases', 'patients', 'dispatch_calls', 'chat_channels']
            return all(t in tables for t in required_tables)
    except Exception as e:
        logger.error(f"Errore check tabelle: {e}")
        return False


async def check_users_exist() -> bool:
    """Verifica se esistono utenti nel database"""
    try:
        async with async_session() as session:
            result = await session.execute(text("SELECT COUNT(*) FROM users"))
            count = result.scalar()
            return count > 0
    except Exception as e:
        logger.error(f"Errore check users: {e}")
        return False


async def init_db():
    """Inizializza il database creando tutte le tabelle (idempotente)"""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Auto-migrations completate: tabelle create/verificate")
        return True
    except Exception as e:
        logger.error(f"Errore init_db: {e}")
        return False


async def run_auto_migrations() -> dict:
    """Esegue auto-migrations se necessario (idempotente)"""
    result = {
        "tables_existed": False,
        "migrations_run": False,
        "success": False,
        "error": None
    }
    
    try:
        # Check se tabelle esistono già
        result["tables_existed"] = await check_tables_exist()
        
        # Esegui migrations (create_all è idempotente)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        result["migrations_run"] = True
        result["success"] = True
        logger.info(f"Auto-migrations: tables_existed={result['tables_existed']}, success=True")
        
    except Exception as e:
        result["error"] = str(e)[:200]
        logger.error(f"Auto-migrations fallite: {e}")
    
    return result
