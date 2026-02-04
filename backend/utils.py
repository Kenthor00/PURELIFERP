"""
PURE LIFE OS - Utility Functions Extended
"""
import random
import string
from datetime import datetime, timezone


def generate_case_number() -> str:
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"CASO-{date_str}-{random_str}"


def generate_warrant_number() -> str:
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"MND-{date_str}-{random_str}"


def generate_fine_number() -> str:
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"MLT-{date_str}-{random_str}"


def generate_patient_number() -> str:
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"PAZ-{date_str}-{random_str}"


def generate_report_number() -> str:
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"REF-{date_str}-{random_str}"


def generate_call_number() -> str:
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"CALL-{date_str}-{random_str}"


def map_fivem_job_to_role(job: str) -> str:
    job_lower = job.lower()
    if job_lower in ['police', 'lspd', 'bcso', 'sasp']:
        return 'police'
    elif job_lower in ['ambulance', 'ems', 'doctor', 'paramedic']:
        return 'ems'
    elif job_lower in ['dispatch', 'dispatcher']:
        return 'dispatch'
    elif job_lower in ['admin', 'staff']:
        return 'admin'
    elif job_lower in ['government', 'mayor', 'governor']:
        return 'government'
    elif job_lower in ['judge', 'magistrate']:
        return 'judge'
    elif job_lower in ['lawyer', 'attorney']:
        return 'lawyer'
    elif job_lower in ['prosecutor', 'da']:
        return 'prosecutor'
    elif job_lower in ['weazel', 'news', 'journalist']:
        return 'weazel'
    return 'citizen'


MEDICAL_TEMPLATES = {
    "trauma": {
        "name": "Referto Trauma",
        "template": """REFERTO MEDICO - TRAUMA

Paziente: {{nome}}
Data: {{data}}

DIAGNOSI:
{{diagnosi}}

TRATTAMENTO EFFETTUATO:
- Valutazione primaria ABC
- Stabilizzazione paziente
- {{trattamento}}

PRESCRIZIONI:
{{prescrizioni}}

NOTE:
{{note}}

Medico: {{medico}}
"""
    },
    "emergenza": {
        "name": "Referto Emergenza",
        "template": """REFERTO PRONTO SOCCORSO

Paziente: {{nome}}
Data/Ora: {{data}}

MOTIVO ACCESSO:
{{motivo}}

ESAME OBIETTIVO:
{{esame}}

DIAGNOSI:
{{diagnosi}}

TERAPIA:
{{terapia}}

ESITO:
{{esito}}

Medico: {{medico}}
"""
    },
    "visita": {
        "name": "Visita Generale",
        "template": """REFERTO VISITA MEDICA

Paziente: {{nome}}
Data: {{data}}

ANAMNESI:
{{anamnesi}}

ESAME OBIETTIVO:
{{esame}}

DIAGNOSI:
{{diagnosi}}

PRESCRIZIONI:
{{prescrizioni}}

FOLLOW-UP:
{{followup}}

Medico: {{medico}}
"""
    }
}


def get_template(template_name: str) -> dict:
    return MEDICAL_TEMPLATES.get(template_name, MEDICAL_TEMPLATES["visita"])


def fill_template(template: str, data: dict) -> str:
    result = template
    for key, value in data.items():
        result = result.replace(f"{{{{{key}}}}}", str(value) if value else "")
    return result
