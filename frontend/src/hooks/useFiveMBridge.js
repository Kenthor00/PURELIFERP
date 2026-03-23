/**
 * useFiveMBridge - Hook per comunicazione con il bridge FiveM
 * Rileva se l'app gira dentro FiveM (iframe del tablet/phone)
 * e gestisce l'auto-link dell'identifier FiveM.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function useFiveMBridge() {
  const [isInFiveM, setIsInFiveM] = useState(false);
  const [linkStatus, setLinkStatus] = useState(null); // null | 'linking' | 'linked' | 'error'
  const [fivemIdentifier, setFivemIdentifier] = useState(null);
  const linkAttemptedRef = useRef(false);

  // Rileva se siamo dentro un iframe FiveM
  useEffect(() => {
    const inIframe = window.self !== window.top;
    
    // Ascolta messaggi dal bridge NUI
    const handleBridgeMessage = (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      switch (data.type) {
        case 'PLOS_LINK_RESULT':
          if (data.success) {
            setLinkStatus('linked');
          } else {
            setLinkStatus('error');
            console.warn('[FiveM Bridge] Link fallito:', data.error);
          }
          break;

        case 'PLOS_LINK_STATUS':
          if (data.linked) {
            setLinkStatus('linked');
          }
          if (data.identifier) {
            setFivemIdentifier(data.identifier);
          }
          break;

        case 'PLOS_PLAYER_DATA':
          if (data.data) {
            setIsInFiveM(true);
          }
          break;

        default:
          // Qualsiasi messaggio PLOS_ indica che siamo in FiveM
          if (data.type.startsWith('PLOS_')) {
            setIsInFiveM(true);
          }
          break;
      }
    };

    window.addEventListener('message', handleBridgeMessage);

    // Test iniziale: prova a comunicare col bridge
    if (inIframe) {
      try {
        window.parent.postMessage({ type: 'PLOS_GET_LINK_STATUS' }, '*');
        // Se risponde, siamo in FiveM
        setIsInFiveM(true);
      } catch (e) {
        // Non in FiveM
      }
    }

    return () => window.removeEventListener('message', handleBridgeMessage);
  }, []);

  // Auto-link: chiamato dopo il login
  const autoLink = useCallback(async (userId, authToken) => {
    if (linkAttemptedRef.current) return;
    linkAttemptedRef.current = true;

    // Metodo 1: Se in FiveM, usa il bridge (server-side, più sicuro)
    if (isInFiveM) {
      setLinkStatus('linking');
      try {
        window.parent.postMessage({
          type: 'PLOS_LINK_ACCOUNT',
          user_id: userId,
          auth_token: authToken,
        }, '*');
      } catch (e) {
        console.warn('[FiveM Bridge] Impossibile inviare messaggio al bridge');
        setLinkStatus('error');
      }
      return;
    }

    // Metodo 2: Se non in FiveM, controlla solo lo stato via API
    try {
      const response = await fetch(`${API_URL}/api/auth/fivem-status`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLinkStatus(data.linked ? 'linked' : null);
        if (data.identifier_preview) {
          setFivemIdentifier(data.identifier_preview);
        }
      }
    } catch (e) {
      // Non critico
    }
  }, [isInFiveM]);

  // Reset per nuovo tentativo
  const resetLink = useCallback(() => {
    linkAttemptedRef.current = false;
    setLinkStatus(null);
  }, []);

  return {
    isInFiveM,
    linkStatus,
    fivemIdentifier,
    autoLink,
    resetLink,
  };
}

export default useFiveMBridge;
