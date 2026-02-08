/**
 * PURE LIFE OS 3.0 - Patient Detail Page
 * Dettaglio paziente con timeline clinica
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../context/SoundContext';
import { DeleteModal, useDelete } from '../../components/DeleteModal';
import { toast } from 'sonner';
import {
  OsPanel,
  OsSectionHeader,
  OsListRow,
  OsBadge,
  OsEmptyState,
  OsPageHeader,
} from '../../components/os/OsComponents';
import {
  User,
  ArrowLeft,
  Droplet,
  Phone,
  AlertTriangle,
  FileText,
  Clock,
  Plus,
  Trash2,
  Edit,
  Activity,
  Heart,
} from 'lucide-react';

export const PatientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const { play } = useSound();
  const { deleteResource, loading: deleteLoading } = useDelete();
  
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null, type: null });
  
  const canDelete = user?.sector === 'ADMIN' || (user?.sector === 'EMS' && user?.hierarchy_level >= 8);

  useEffect(() => {
    fetchPatient();
  }, [id]);

  const fetchPatient = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/ems/patients/${id}`);
      setPatient(res.data);
    } catch (error) {
      console.error('Errore fetch paziente:', error);
      toast.error('Paziente non trovato');
      navigate('/ems/patients');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-plos-surface rounded w-1/3"></div>
        <div className="h-64 bg-plos-surface rounded"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <User size={48} className="mx-auto mb-4 text-plos-text-muted" />
        <p className="text-plos-text-secondary">Paziente non trovato</p>
        <button onClick={() => navigate('/ems/patients')} className="btn-tactical mt-4">
          Torna alla lista
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="patient-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/ems/patients')}
            className="p-2 hover:bg-plos-surface rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-plos-text-secondary" />
          </button>
          <div>
            <p className="mono text-xs text-red-500">{patient.patient_number}</p>
            <h1 className="font-heading text-2xl tracking-wider flex items-center gap-3">
              <User className="text-red-500" />
              {patient.name}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {canDelete && (
            <button
              onClick={() => setDeleteModal({ open: true, item: patient, type: 'patient' })}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
              title="Elimina paziente"
            >
              <Trash2 size={20} className="text-red-400" />
            </button>
          )}
          <button
            onClick={() => {
              play('click');
              navigate(`/ems/reports?patient=${patient.id}`);
            }}
            className="btn-tactical flex items-center gap-2"
          >
            <Plus size={18} />
            NUOVO REFERTO
          </button>
        </div>
      </div>

      {/* Patient Info */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <OsPanel className="lg:col-span-2">
          <OsSectionHeader icon={User} title="DATI PAZIENTE" color="red" />
          
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-plos-text-muted mb-1">IDENTIFICATIVO</p>
                <p className="font-medium">{patient.identifier || 'Non specificato'}</p>
              </div>
              
              <div>
                <p className="text-xs text-plos-text-muted mb-1">GRUPPO SANGUIGNO</p>
                <div className="flex items-center gap-2">
                  <Droplet size={16} className="text-red-500" />
                  <span className="font-medium text-red-400">{patient.blood_type || 'Non specificato'}</span>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-plos-text-muted mb-1">TELEFONO</p>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-plos-text-muted" />
                  <span>{patient.phone_number || 'Non specificato'}</span>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-plos-text-muted mb-1">CONTATTO EMERGENZA</p>
                <span>{patient.emergency_contact || 'Non specificato'}</span>
              </div>
            </div>
            
            {patient.allergies && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-orange-500" />
                  <span className="font-heading text-sm text-orange-400">ALLERGIE</span>
                </div>
                <p className="text-sm">{patient.allergies}</p>
              </div>
            )}
            
            {patient.medical_history && (
              <div>
                <p className="text-xs text-plos-text-muted mb-2">ANAMNESI</p>
                <p className="text-sm text-plos-text-secondary whitespace-pre-wrap">
                  {patient.medical_history}
                </p>
              </div>
            )}
            
            <div className="pt-3 border-t border-plos-border/30 text-xs text-plos-text-muted">
              Registrato il {new Date(patient.created_at).toLocaleString('it-IT')}
            </div>
          </div>
        </OsPanel>

        {/* Stats */}
        <div className="space-y-4">
          <OsPanel>
            <div className="p-4 text-center">
              <Heart size={32} className="mx-auto mb-2 text-red-500" />
              <p className="text-3xl font-heading font-bold text-red-400">
                {patient.reports?.length || 0}
              </p>
              <p className="text-xs text-plos-text-muted">REFERTI TOTALI</p>
            </div>
          </OsPanel>
          
          {patient.is_critical && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
              <AlertTriangle size={24} className="mx-auto mb-2 text-red-500" />
              <p className="font-heading text-red-400">PAZIENTE CRITICO</p>
            </div>
          )}
        </div>
      </div>

      {/* Medical Reports */}
      <OsPanel>
        <OsSectionHeader
          icon={FileText}
          title="REFERTI MEDICI"
          color="plos-primary"
          action={() => navigate(`/ems/reports?patient=${patient.id}`)}
          actionLabel="TUTTI I REFERTI"
        />
        
        <div className="divide-y divide-plos-border/20">
          {(!patient.reports || patient.reports.length === 0) ? (
            <OsEmptyState
              icon={FileText}
              title="Nessun referto"
              description="Crea il primo referto per questo paziente"
              action={() => navigate(`/ems/reports?patient=${patient.id}`)}
              actionLabel="Nuovo referto"
            />
          ) : (
            patient.reports.slice(0, 5).map((report, index) => (
              <OsListRow
                key={report.id}
                index={index}
                onClick={() => navigate(`/ems/reports/${report.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="mono text-xs text-plos-primary">{report.report_number}</span>
                      <OsBadge variant={report.severity === 'critical' ? 'danger' : report.severity === 'moderate' ? 'warning' : 'info'}>
                        {report.severity?.toUpperCase() || 'N/D'}
                      </OsBadge>
                    </div>
                    <p className="text-sm font-medium">{report.diagnosis || 'Diagnosi non specificata'}</p>
                    <p className="text-xs text-plos-text-muted mt-1">
                      {new Date(report.created_at).toLocaleString('it-IT')}
                    </p>
                  </div>
                </div>
              </OsListRow>
            ))
          )}
        </div>
      </OsPanel>

      {/* Timeline */}
      {patient.timeline && patient.timeline.length > 0 && (
        <OsPanel>
          <OsSectionHeader icon={Clock} title="TIMELINE CLINICA" color="blue" />
          
          <div className="p-4 space-y-4">
            {patient.timeline.slice(0, 10).map((event, index) => (
              <div key={event.id} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Activity size={14} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{event.title}</p>
                  <p className="text-xs text-plos-text-secondary mt-1">{event.description}</p>
                  <p className="text-xs text-plos-text-muted mt-2">
                    {new Date(event.created_at).toLocaleString('it-IT')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </OsPanel>
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null, type: null })}
        resourceType="patient"
        resourceName={patient?.patient_number || ''}
        resourceId={patient?.id}
        allowPermanent={true}
        loading={deleteLoading}
        onConfirm={async (options) => {
          const result = await deleteResource('patient', patient.id, options);
          if (result.success) {
            toast.success('Paziente eliminato con successo');
            navigate('/ems/patients');
          } else {
            toast.error(result.error);
          }
        }}
      />
    </div>
  );
};

export default PatientDetailPage;
