import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const FiveMAuthPage = () => {
  const { fivemLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleFiveMAuth = async () => {
      try {
        const result = await fivemLogin();
        
        // Handle deep links
        const open = searchParams.get('open');
        const id = searchParams.get('id');
        
        let redirectPath = result.redirect_path;
        
        if (open) {
          switch (open) {
            case 'dispatch':
              redirectPath = '/dispatch';
              break;
            case 'case':
              redirectPath = id ? `/lspd/cases/${id}` : '/lspd/cases';
              break;
            case 'patient':
              redirectPath = id ? `/ems/patients/${id}` : '/ems/patients';
              break;
            default:
              break;
          }
        }
        
        navigate(redirectPath, { replace: true });
      } catch (error) {
        console.error('Errore FiveM Auth:', error);
        navigate('/login', { 
          state: { error: 'Autenticazione FiveM fallita' },
          replace: true 
        });
      }
    };

    handleFiveMAuth();
  }, [fivemLogin, navigate, searchParams]);

  return (
    <div className="min-h-screen tactical-bg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-plos-primary animate-spin mx-auto mb-4" />
        <p className="font-heading text-xl tracking-wider">AUTENTICAZIONE FIVEM</p>
        <p className="text-plos-text-secondary text-sm mt-2">Connessione in corso...</p>
      </div>
    </div>
  );
};

export default FiveMAuthPage;
