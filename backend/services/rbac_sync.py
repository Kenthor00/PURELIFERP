"""
PURE LIFE OS - RBAC Sync Service
Sincronizzazione Job/Gradi da ESX e QBCore
"""
import logging
import json
from datetime import datetime, timezone
from typing import Optional, Dict, List, Tuple, Any
from enum import Enum
from dataclasses import dataclass, asdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, and_

from models import Job, JobGrade, AuditLog, AuditAction

logger = logging.getLogger(__name__)


class SyncMode(str, Enum):
    MERGE = "merge"    # Aggiunge nuovi, aggiorna label, non elimina
    STRICT = "strict"  # Rimuove job/gradi non presenti (pericoloso)


class SyncSource(str, Enum):
    AUTO = "auto"      # Rileva automaticamente
    ESX = "esx"        # ESX Framework (tabelle jobs, job_grades)
    QBCORE = "qbcore"  # QBCore (shared/jobs.lua o qb_jobs table)


@dataclass
class SyncReportItem:
    job_code: str
    job_name: str
    action: str  # 'added', 'updated', 'skipped', 'removed'
    details: str
    grades_added: int = 0
    grades_updated: int = 0
    grades_skipped: int = 0
    grades_removed: int = 0


@dataclass
class SyncReport:
    timestamp: str
    source: str
    mode: str
    dry_run: bool
    framework_detected: Optional[str]
    jobs_added: int = 0
    jobs_updated: int = 0
    jobs_skipped: int = 0
    jobs_removed: int = 0
    grades_added: int = 0
    grades_updated: int = 0
    grades_skipped: int = 0
    grades_removed: int = 0
    errors: List[str] = None
    items: List[Dict] = None
    duration_ms: int = 0

    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.items is None:
            self.items = []

    def to_dict(self):
        return asdict(self)


# Mapping label italiane per job comuni
ITALIAN_JOB_LABELS = {
    'police': 'LSPD - Polizia',
    'lspd': 'LSPD - Polizia',
    'ambulance': 'EMS - Servizi Medici',
    'ems': 'EMS - Servizi Medici',
    'mechanic': 'Meccanico',
    'taxi': 'Taxi',
    'cardealer': 'Concessionario Auto',
    'realestate': 'Agenzia Immobiliare',
    'judge': 'Giudice',
    'lawyer': 'Avvocato',
    'reporter': 'Reporter',
    'weazel': 'Weazel News',
    'unemployed': 'Disoccupato',
    'government': 'Governo',
    'mayor': 'Sindaco',
    'sheriff': 'Sceriffo',
    'bcso': 'BCSO - Sceriffo',
    'bus': 'Autista Bus',
    'trucker': 'Camionista',
    'garbage': 'Netturbino',
    'banker': 'Banchiere',
    'tow': 'Carroattrezzi',
    'vineyard': 'Vigneto',
    'hunting': 'Cacciatore',
    'fishing': 'Pescatore',
    'pilot': 'Pilota',
}

# Mapping label italiane per gradi comuni
ITALIAN_GRADE_LABELS = {
    # Polizia
    'recruit': 'Recluta',
    'officer': 'Agente',
    'senior_officer': 'Agente Senior',
    'sergeant': 'Sergente',
    'lieutenant': 'Tenente',
    'captain': 'Capitano',
    'commander': 'Comandante',
    'deputy_chief': 'Vice Capo',
    'chief': 'Capo',
    # EMS
    'paramedic': 'Soccorritore',
    'emt': 'Soccorritore',
    'nurse': 'Infermiere',
    'doctor': 'Dottore',
    'surgeon': 'Chirurgo',
    'chief_of_staff': 'Primario',
    'director': 'Direttore',
    # Generici
    'trainee': 'Apprendista',
    'junior': 'Junior',
    'senior': 'Senior',
    'manager': 'Manager',
    'supervisor': 'Supervisore',
    'owner': 'Proprietario',
    'boss': 'Capo',
}

# Mapping categorie
JOB_CATEGORY_MAP = {
    'police': 'law_enforcement',
    'lspd': 'law_enforcement',
    'sheriff': 'law_enforcement',
    'bcso': 'law_enforcement',
    'ambulance': 'medical',
    'ems': 'medical',
    'judge': 'government',
    'lawyer': 'government',
    'government': 'government',
    'mayor': 'government',
    'reporter': 'media',
    'weazel': 'media',
    'mechanic': 'civilian',
    'taxi': 'civilian',
    'cardealer': 'civilian',
    'unemployed': 'civilian',
}


class RBACSyncService:
    """Servizio per sincronizzazione Job/Gradi da FiveM"""
    
    def __init__(self, fivem_db_url: Optional[str] = None):
        """
        Inizializza il servizio di sync.
        
        Args:
            fivem_db_url: URL del database FiveM (es. mysql://user:pass@host/essentialmode)
                         Se None, usa la stessa connessione del backend
        """
        self.fivem_db_url = fivem_db_url
        self._last_report: Optional[SyncReport] = None
    
    async def detect_framework(self, db: AsyncSession) -> Tuple[str, str]:
        """
        Rileva automaticamente il framework FiveM in uso.
        
        Returns:
            Tuple (framework_name, detection_method)
        """
        # Check per tabelle ESX
        try:
            result = await db.execute(text("SHOW TABLES LIKE 'job_grades'"))
            if result.fetchone():
                # Verifica struttura ESX (job, grade, name, salary)
                result = await db.execute(text("DESCRIBE job_grades"))
                columns = [row[0] for row in result.fetchall()]
                if 'job' in columns and 'grade' in columns:
                    return ('esx', 'Found job_grades table with ESX structure')
        except Exception as e:
            logger.debug(f"ESX detection failed: {e}")
        
        # Check per tabelle QBCore
        try:
            result = await db.execute(text("SHOW TABLES LIKE 'qb_%'"))
            qb_tables = result.fetchall()
            if qb_tables:
                return ('qbcore', f'Found {len(qb_tables)} qb_* tables')
        except Exception as e:
            logger.debug(f"QBCore detection failed: {e}")
        
        # Check per players table con job column (generico ESX)
        try:
            result = await db.execute(text("DESCRIBE users"))
            columns = [row[0] for row in result.fetchall()]
            if 'job' in columns and 'job_grade' in columns:
                return ('esx', 'Found users table with job/job_grade columns')
        except Exception as e:
            logger.debug(f"Generic ESX detection failed: {e}")
        
        return ('unknown', 'Could not detect framework')
    
    async def fetch_esx_jobs(self, db: AsyncSession) -> List[Dict]:
        """Recupera job e gradi da database ESX"""
        jobs_data = []
        
        try:
            # Fetch jobs table
            result = await db.execute(text("""
                SELECT name, label 
                FROM jobs 
                ORDER BY name
            """))
            jobs = result.fetchall()
            
            for job_row in jobs:
                job_name = job_row[0]
                job_label = job_row[1] or job_name
                
                # Fetch grades per job
                grades_result = await db.execute(text("""
                    SELECT grade, name, salary 
                    FROM job_grades 
                    WHERE job = :job 
                    ORDER BY grade
                """), {"job": job_name})
                grades = grades_result.fetchall()
                
                jobs_data.append({
                    'code': job_name,
                    'name': job_label,
                    'grades': [
                        {
                            'level': g[0],
                            'name': g[1],
                            'salary': g[2] or 0
                        }
                        for g in grades
                    ]
                })
            
            return jobs_data
            
        except Exception as e:
            logger.error(f"Error fetching ESX jobs: {e}")
            raise
    
    async def fetch_qbcore_jobs(self, db: AsyncSession) -> List[Dict]:
        """
        Recupera job da QBCore.
        Nota: QBCore usa config Lua, quindi cerchiamo in tabelle alternative
        o usiamo una struttura predefinita.
        """
        jobs_data = []
        
        try:
            # Prima prova: cerca tabella qb_jobs se esiste
            result = await db.execute(text("SHOW TABLES LIKE 'qb_jobs'"))
            if result.fetchone():
                result = await db.execute(text("SELECT * FROM qb_jobs"))
                rows = result.fetchall()
                # Parsing dipende dalla struttura
                for row in rows:
                    # Struttura tipica: name, label, grades (JSON)
                    if len(row) >= 3:
                        try:
                            grades = json.loads(row[2]) if isinstance(row[2], str) else row[2]
                            jobs_data.append({
                                'code': row[0],
                                'name': row[1],
                                'grades': grades
                            })
                        except:
                            pass
            
            # Seconda prova: tabella players per estrarre job unici
            if not jobs_data:
                result = await db.execute(text("""
                    SELECT DISTINCT JSON_EXTRACT(job, '$.name') as job_name,
                           JSON_EXTRACT(job, '$.label') as job_label
                    FROM players 
                    WHERE job IS NOT NULL
                """))
                unique_jobs = result.fetchall()
                
                for job in unique_jobs:
                    if job[0]:
                        jobs_data.append({
                            'code': job[0].strip('"'),
                            'name': job[1].strip('"') if job[1] else job[0].strip('"'),
                            'grades': []  # QBCore grades sono nel config
                        })
            
            return jobs_data
            
        except Exception as e:
            logger.error(f"Error fetching QBCore jobs: {e}")
            raise
    
    def italianize_label(self, code: str, original_label: str, is_grade: bool = False) -> str:
        """Traduce label in italiano se disponibile"""
        code_lower = code.lower().replace('_', '').replace('-', '')
        
        if is_grade:
            # Cerca match parziale per gradi
            for key, italian in ITALIAN_GRADE_LABELS.items():
                if key in code_lower or code_lower in key:
                    return italian
        else:
            # Cerca match esatto o parziale per job
            if code_lower in ITALIAN_JOB_LABELS:
                return ITALIAN_JOB_LABELS[code_lower]
            for key, italian in ITALIAN_JOB_LABELS.items():
                if key in code_lower:
                    return italian
        
        # Ritorna originale se non trovato
        return original_label
    
    def get_job_category(self, job_code: str) -> str:
        """Determina la categoria del job"""
        code_lower = job_code.lower()
        
        for key, category in JOB_CATEGORY_MAP.items():
            if key in code_lower:
                return category
        
        return 'civilian'
    
    async def sync_jobs(
        self,
        db: AsyncSession,
        source: SyncSource = SyncSource.AUTO,
        mode: SyncMode = SyncMode.MERGE,
        dry_run: bool = False,
        user_id: Optional[int] = None
    ) -> SyncReport:
        """
        Esegue la sincronizzazione dei job.
        
        Args:
            db: Sessione database
            source: Sorgente dati (auto, esx, qbcore)
            mode: Modalità sync (merge, strict)
            dry_run: Se True, non applica modifiche
            user_id: ID utente che esegue il sync (per audit)
            
        Returns:
            SyncReport con dettagli operazione
        """
        start_time = datetime.now(timezone.utc)
        
        report = SyncReport(
            timestamp=start_time.isoformat(),
            source=source.value,
            mode=mode.value,
            dry_run=dry_run,
            framework_detected=None
        )
        
        try:
            # Detect framework se auto
            if source == SyncSource.AUTO:
                framework, method = await self.detect_framework(db)
                report.framework_detected = f"{framework} ({method})"
                
                if framework == 'esx':
                    source = SyncSource.ESX
                elif framework == 'qbcore':
                    source = SyncSource.QBCORE
                else:
                    report.errors.append(f"Framework non rilevato: {method}")
                    self._last_report = report
                    return report
            
            # Fetch jobs dalla sorgente
            if source == SyncSource.ESX:
                external_jobs = await self.fetch_esx_jobs(db)
            elif source == SyncSource.QBCORE:
                external_jobs = await self.fetch_qbcore_jobs(db)
            else:
                report.errors.append(f"Sorgente non supportata: {source}")
                self._last_report = report
                return report
            
            if not external_jobs:
                report.errors.append("Nessun job trovato nella sorgente")
                self._last_report = report
                return report
            
            # Carica job esistenti dal nostro DB
            existing_jobs_result = await db.execute(select(Job))
            existing_jobs = {j.code: j for j in existing_jobs_result.scalars().all()}
            
            processed_codes = set()
            
            # Processa ogni job esterno
            for ext_job in external_jobs:
                job_code = ext_job['code']
                processed_codes.add(job_code)
                
                # Traduci label
                italian_name = self.italianize_label(job_code, ext_job['name'])
                category = self.get_job_category(job_code)
                
                item = SyncReportItem(
                    job_code=job_code,
                    job_name=italian_name,
                    action='skipped',
                    details=''
                )
                
                if job_code in existing_jobs:
                    # Job esiste - controlla aggiornamenti
                    existing = existing_jobs[job_code]
                    needs_update = False
                    changes = []
                    
                    if existing.name != italian_name:
                        changes.append(f"name: {existing.name} → {italian_name}")
                        needs_update = True
                    
                    if needs_update:
                        if not dry_run:
                            existing.name = italian_name
                            existing.updated_at = datetime.now(timezone.utc)
                        item.action = 'updated'
                        item.details = ', '.join(changes)
                        report.jobs_updated += 1
                    else:
                        item.action = 'skipped'
                        item.details = 'Nessuna modifica necessaria'
                        report.jobs_skipped += 1
                    
                    # Sync gradi
                    grades_result = await self._sync_grades(
                        db, existing.id, ext_job.get('grades', []), 
                        mode, dry_run
                    )
                    item.grades_added = grades_result['added']
                    item.grades_updated = grades_result['updated']
                    item.grades_skipped = grades_result['skipped']
                    item.grades_removed = grades_result['removed']
                    
                else:
                    # Nuovo job
                    if not dry_run:
                        new_job = Job(
                            code=job_code,
                            name=italian_name,
                            name_short=job_code.upper()[:10],
                            category=category,
                            is_active=True,
                            is_whitelisted=category in ['law_enforcement', 'medical', 'government']
                        )
                        db.add(new_job)
                        await db.flush()
                        
                        # Aggiungi gradi
                        for grade in ext_job.get('grades', []):
                            grade_name = self.italianize_label(
                                grade.get('name', ''),
                                grade.get('name', f"Grado {grade.get('level', 0)}"),
                                is_grade=True
                            )
                            new_grade = JobGrade(
                                job_id=new_job.id,
                                grade_level=grade.get('level', 0),
                                code=grade.get('name', '').lower().replace(' ', '_'),
                                name=grade_name,
                                salary=grade.get('salary', 0)
                            )
                            db.add(new_grade)
                            item.grades_added += 1
                    
                    item.action = 'added'
                    item.details = f"Nuovo job con {len(ext_job.get('grades', []))} gradi"
                    item.grades_added = len(ext_job.get('grades', []))
                    report.jobs_added += 1
                
                report.items.append(asdict(item))
                report.grades_added += item.grades_added
                report.grades_updated += item.grades_updated
                report.grades_skipped += item.grades_skipped
                report.grades_removed += item.grades_removed
            
            # Strict mode: rimuovi job non presenti
            if mode == SyncMode.STRICT:
                for existing_code, existing_job in existing_jobs.items():
                    if existing_code not in processed_codes:
                        if not dry_run:
                            await db.delete(existing_job)
                        
                        item = SyncReportItem(
                            job_code=existing_code,
                            job_name=existing_job.name,
                            action='removed',
                            details='Non presente nella sorgente (strict mode)'
                        )
                        report.items.append(asdict(item))
                        report.jobs_removed += 1
            
            # Commit se non dry run
            if not dry_run:
                await db.commit()
                
                # Audit log
                if user_id:
                    audit = AuditLog(
                        action=AuditAction.RBAC_SYNC if hasattr(AuditAction, 'RBAC_SYNC') else AuditAction.PERMISSION_CHANGE,
                        user_id=user_id,
                        entity_type='rbac_sync',
                        description=f"Sync {source.value} ({mode.value}): +{report.jobs_added} jobs, ~{report.jobs_updated} aggiornati",
                        metadata={
                            'source': source.value,
                            'mode': mode.value,
                            'jobs_added': report.jobs_added,
                            'jobs_updated': report.jobs_updated,
                            'grades_added': report.grades_added
                        }
                    )
                    db.add(audit)
                    await db.commit()
            
            # Calcola durata
            end_time = datetime.now(timezone.utc)
            report.duration_ms = int((end_time - start_time).total_seconds() * 1000)
            
        except Exception as e:
            logger.error(f"Sync error: {e}")
            report.errors.append(str(e))
            await db.rollback()
        
        self._last_report = report
        return report
    
    async def _sync_grades(
        self,
        db: AsyncSession,
        job_id: int,
        external_grades: List[Dict],
        mode: SyncMode,
        dry_run: bool
    ) -> Dict[str, int]:
        """Sincronizza i gradi di un job"""
        result = {'added': 0, 'updated': 0, 'skipped': 0, 'removed': 0}
        
        # Carica gradi esistenti
        existing_result = await db.execute(
            select(JobGrade).where(JobGrade.job_id == job_id)
        )
        existing_grades = {g.grade_level: g for g in existing_result.scalars().all()}
        
        processed_levels = set()
        
        for ext_grade in external_grades:
            level = ext_grade.get('level', 0)
            processed_levels.add(level)
            
            grade_name = self.italianize_label(
                ext_grade.get('name', ''),
                ext_grade.get('name', f"Grado {level}"),
                is_grade=True
            )
            
            if level in existing_grades:
                existing = existing_grades[level]
                if existing.name != grade_name or existing.salary != ext_grade.get('salary', 0):
                    if not dry_run:
                        existing.name = grade_name
                        existing.salary = ext_grade.get('salary', 0)
                    result['updated'] += 1
                else:
                    result['skipped'] += 1
            else:
                if not dry_run:
                    new_grade = JobGrade(
                        job_id=job_id,
                        grade_level=level,
                        code=ext_grade.get('name', '').lower().replace(' ', '_'),
                        name=grade_name,
                        salary=ext_grade.get('salary', 0)
                    )
                    db.add(new_grade)
                result['added'] += 1
        
        # Strict mode: rimuovi gradi non presenti
        if mode == SyncMode.STRICT:
            for level, existing_grade in existing_grades.items():
                if level not in processed_levels:
                    if not dry_run:
                        await db.delete(existing_grade)
                    result['removed'] += 1
        
        return result
    
    def get_last_report(self) -> Optional[Dict]:
        """Ritorna l'ultimo report di sync"""
        if self._last_report:
            return self._last_report.to_dict()
        return None


# Singleton instance
sync_service = RBACSyncService()
