"""
PURE LIFE OS - Database Configuration
MySQL con SQLAlchemy Async + SQLite fallback per development
Supporta DATABASE_URL (Railway) o variabili separate o SQLite locale
"""
import os
import logging
import re
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Flag per indicare se stiamo usando SQLite
USING_SQLITE = False


def build_database_url() -> str:
    """
    Costruisce l'URL del database.
    Priorità: DATABASE_URL (Railway) > variabili MySQL > SQLite locale
    """
    global USING_SQLITE
    
    database_url = os.environ.get('DATABASE_URL')
    
    if database_url:
        # Se è un URL interno Railway, prova a usare MYSQL_PUBLIC_URL
        if 'railway.internal' in database_url:
            public_url = os.environ.get('MYSQL_PUBLIC_URL')
            if public_url:
                logger.info("Usando MYSQL_PUBLIC_URL (URL pubblico Railway)")
                database_url = public_url
            else:
                logger.warning("DATABASE_URL punta a Railway internal senza MYSQL_PUBLIC_URL - uso SQLite locale")
                # Continua al fallback SQLite
                database_url = None
        
        if database_url:
            # Railway fornisce mysql:// ma SQLAlchemy async richiede mysql+aiomysql://
            if database_url.startswith('mysql://'):
                database_url = database_url.replace('mysql://', 'mysql+aiomysql://', 1)
            elif database_url.startswith('mysql+pymysql://'):
                database_url = database_url.replace('mysql+pymysql://', 'mysql+aiomysql://', 1)
            elif not database_url.startswith('mysql+aiomysql://') and 'mysql' in database_url:
                database_url = re.sub(r'^mysql(\+\w+)?://', 'mysql+aiomysql://', database_url)
            
            logger.info("Usando DATABASE_URL MySQL")
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
    
    # Fallback finale: SQLite locale per development
    USING_SQLITE = True
    sqlite_path = ROOT_DIR / 'purelife_os.db'
    logger.warning(f"Usando SQLite locale: {sqlite_path}")
    return f"sqlite+aiosqlite:///{sqlite_path}"


# Build database URL
DATABASE_URL = build_database_url()

# Crea engine - configurazione diversa per SQLite vs MySQL
if USING_SQLITE:
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        pool_pre_ping=True,        # Verifica connessione prima di usarla
        pool_size=10,              # Connessioni persistenti nel pool
        max_overflow=20,           # Connessioni extra in caso di picco
        pool_recycle=1800,         # Ricicla connessioni ogni 30 minuti
        pool_timeout=30,           # Timeout per ottenere connessione dal pool
        connect_args={
            "connect_timeout": 10,
            "read_timeout": 30,
            "write_timeout": 30,
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
            if USING_SQLITE:
                result = await session.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            else:
                result = await session.execute(text("SHOW TABLES"))
            tables = [row[0] for row in result.fetchall()]
            required_tables = ['users', 'audit_logs']
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
        "error": None,
        "using_sqlite": USING_SQLITE
    }
    
    try:
        # Check se tabelle esistono già
        result["tables_existed"] = await check_tables_exist()
        
        # Esegui migrations (create_all è idempotente)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        result["migrations_run"] = True
        result["success"] = True
        logger.info(f"Auto-migrations: tables_existed={result['tables_existed']}, success=True, sqlite={USING_SQLITE}")
        
        # Run column migrations for new fields
        await run_column_migrations()
        
    except Exception as e:
        result["error"] = str(e)[:200]
        logger.error(f"Auto-migrations fallite: {e}")
    
    return result


async def run_column_migrations():
    """Aggiunge colonne mancanti alle tabelle esistenti (idempotente)"""
    migrations = [
        # Warrant status columns
        ("warrants", "status", "VARCHAR(20) DEFAULT 'open'"),
        ("warrants", "cancelled_at", "DATETIME NULL"),
        ("warrants", "cancelled_by", "INT NULL"),
        ("warrants", "cancellation_reason", "TEXT NULL"),
        # Fine modification columns
        ("fines", "updated_at", "DATETIME NULL"),
        ("fines", "last_modified_by", "INT NULL"),
        ("fines", "modification_reason", "TEXT NULL"),
        # LegalCase lawyer_name
        ("legal_cases", "lawyer_name", "VARCHAR(100) NULL"),
        # User NUI fields
        ("users", "created_via", "VARCHAR(50) NULL"),
    ]
    
    # New tables to create
    new_tables = [
        # Appointment Requests table (legacy)
        """
        CREATE TABLE IF NOT EXISTS appointment_requests (
            id INT PRIMARY KEY AUTO_INCREMENT,
            target_sector VARCHAR(50) NOT NULL,
            requester_id INT NOT NULL,
            requester_game_name VARCHAR(100) NOT NULL,
            requester_sector VARCHAR(50) NOT NULL,
            subject VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            preferred_date DATETIME,
            preferred_time VARCHAR(50),
            urgency VARCHAR(20) DEFAULT 'normal',
            status VARCHAR(20) DEFAULT 'pending',
            handler_id INT,
            handler_game_name VARCHAR(100),
            handler_notes TEXT,
            scheduled_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_target_sector (target_sector),
            INDEX idx_status (status)
        )
        """,
        # Appointments table (new agenda system)
        """
        CREATE TABLE IF NOT EXISTS agenda_appointments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            appointment_type VARCHAR(50) DEFAULT 'meeting',
            status VARCHAR(50) DEFAULT 'scheduled',
            scheduled_at DATETIME NOT NULL,
            duration_minutes INT DEFAULT 60,
            end_at DATETIME,
            location VARCHAR(200),
            location_coords_x FLOAT,
            location_coords_y FLOAT,
            organizer_id INT NOT NULL,
            participant_ids JSON,
            legal_case_id INT,
            lspd_case_id INT,
            reminder_settings JSON,
            reminder_sent JSON,
            discord_webhook_url VARCHAR(500),
            discord_notified BOOLEAN DEFAULT FALSE,
            notes TEXT,
            is_private BOOLEAN DEFAULT FALSE,
            is_all_day BOOLEAN DEFAULT FALSE,
            color VARCHAR(20),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            cancelled_at DATETIME,
            cancelled_by INT,
            cancellation_reason TEXT,
            INDEX idx_scheduled_at (scheduled_at),
            INDEX idx_status (status),
            INDEX idx_organizer (organizer_id)
        )
        """,
        # Documents table
        """
        CREATE TABLE IF NOT EXISTS documents (
            id INT PRIMARY KEY AUTO_INCREMENT,
            verification_code VARCHAR(64) UNIQUE NOT NULL,
            document_type VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'valid',
            holder_id INT NOT NULL,
            holder_name VARCHAR(100) NOT NULL,
            holder_identifier VARCHAR(100),
            issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            issued_by INT NOT NULL,
            issuing_authority VARCHAR(100),
            details JSON,
            suspended_at DATETIME,
            suspended_by INT,
            suspension_reason TEXT,
            suspension_until DATETIME,
            revoked_at DATETIME,
            revoked_by INT,
            revocation_reason TEXT,
            last_verified_at DATETIME,
            verification_count INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_verification_code (verification_code),
            INDEX idx_holder (holder_id),
            INDEX idx_status (status)
        )
        """,
        # Marketplace listings table
        """
        CREATE TABLE IF NOT EXISTS marketplace_listings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            price FLOAT,
            price_negotiable BOOLEAN DEFAULT TRUE,
            currency VARCHAR(10) DEFAULT '$',
            seller_id INT NOT NULL,
            contact_phone VARCHAR(20),
            contact_email VARCHAR(255),
            contact_discord VARCHAR(100),
            images JSON,
            location VARCHAR(200),
            location_coords_x FLOAT,
            location_coords_y FLOAT,
            details JSON,
            is_featured BOOLEAN DEFAULT FALSE,
            views_count INT DEFAULT 0,
            published_at DATETIME,
            expires_at DATETIME,
            sold_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_category (category),
            INDEX idx_status (status),
            INDEX idx_seller (seller_id)
        )
        """,
        # Marketplace interests table
        """
        CREATE TABLE IF NOT EXISTS marketplace_interests (
            id INT PRIMARY KEY AUTO_INCREMENT,
            listing_id INT NOT NULL,
            user_id INT NOT NULL,
            message TEXT,
            contact_phone VARCHAR(20),
            is_read BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_listing (listing_id),
            INDEX idx_user (user_id)
        )
        """,
        # Map POIs table (if not exists)
        """
        CREATE TABLE IF NOT EXISTS map_pois (
            id INT PRIMARY KEY AUTO_INCREMENT,
            x_percent FLOAT NOT NULL,
            y_percent FLOAT NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            category VARCHAR(50) DEFAULT 'altro',
            icon VARCHAR(50),
            color VARCHAR(20),
            address VARCHAR(200),
            phone VARCHAR(50),
            website VARCHAR(200),
            is_active BOOLEAN DEFAULT TRUE,
            is_public BOOLEAN DEFAULT TRUE,
            created_by INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            updated_by INT,
            INDEX idx_category (category),
            INDEX idx_active (is_active)
        )
        """
    ]
    
    try:
        async with async_session() as session:
            # Create new tables
            for create_sql in new_tables:
                try:
                    await session.execute(text(create_sql))
                    logger.info("Tabella creata o già esistente")
                except Exception as table_err:
                    logger.debug(f"Create table skip: {table_err}")
            
            await session.commit()
            
            # Column migrations
            for table, column, column_def in migrations:
                try:
                    if USING_SQLITE:
                        # SQLite: check if column exists
                        result = await session.execute(text(f"PRAGMA table_info({table})"))
                        columns = [row[1] for row in result.fetchall()]
                        if column not in columns:
                            await session.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {column_def}"))
                            logger.info(f"Aggiunta colonna {table}.{column}")
                    else:
                        # MySQL: check if column exists and add if not
                        check_sql = text(f"""
                            SELECT COUNT(*) FROM information_schema.COLUMNS 
                            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table}' AND COLUMN_NAME = '{column}'
                        """)
                        result = await session.execute(check_sql)
                        if result.scalar() == 0:
                            await session.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {column_def}"))
                            logger.info(f"Aggiunta colonna {table}.{column}")
                except Exception as col_err:
                    # Ignora errori se la colonna esiste già
                    logger.debug(f"Colonna {table}.{column} skip: {col_err}")
            
            await session.commit()
    except Exception as e:
        logger.error(f"Errore column migrations: {e}")
