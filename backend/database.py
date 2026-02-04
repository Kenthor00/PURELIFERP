"""
PURE LIFE OS - Database Configuration
MySQL con SQLAlchemy Async
"""
import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
MYSQL_PORT = os.environ.get('MYSQL_PORT', '3306')
MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '')
MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE', 'purelife_os')

DATABASE_URL = f"mysql+aiomysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
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
