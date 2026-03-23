/**
 * PLOS Bridge - NUI Script
 * Comunicazione tra FiveM NUI e PURE LIFE OS webapp
 */

(function() {
    'use strict';

    // ============================================
    // STATE
    // ============================================
    
    let isOpen = false;
    let currentMode = null; // 'tablet' | 'phone'
    let currentUrl = null;
    let playerData = null;
    let config = null;
    let handshakeToken = null;

    // DOM Elements
    const container = document.getElementById('plos-container');
    const frameWrapper = document.getElementById('plos-frame-wrapper');
    const frame = document.getElementById('plos-frame');
    const loadingOverlay = document.getElementById('plos-loading');
    const errorOverlay = document.getElementById('plos-error');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');
    const closeErrorBtn = document.getElementById('close-error-btn');

    // ============================================
    // FIVEM NUI MESSAGE HANDLER
    // ============================================

    window.addEventListener('message', function(event) {
        const data = event.data;
        
        if (!data || !data.action) return;

        switch (data.action) {
            case 'OPEN_PLOS':
                openPLOS(data.mode, data.url, data.playerData, data.config);
                break;
                
            case 'CLOSE_PLOS':
                closePLOS();
                break;
                
            case 'PUSH_NOTIFICATION':
                handlePushNotification(data.payload);
                break;
                
            case 'PLAYER_CONTEXT_UPDATED':
                handlePlayerContextUpdate(data.payload);
                break;
                
            case 'HANDSHAKE_RESULT':
                handleHandshakeResult(data.success, data.data);
                break;
        }
    });

    // ============================================
    // OPEN / CLOSE
    // ============================================

    function openPLOS(mode, url, pData, cfg) {
        if (isOpen) return;

        isOpen = true;
        currentMode = mode;
        currentUrl = url;
        playerData = pData;
        config = cfg;

        // Imposta classe modalità
        container.classList.remove('phone-mode', 'tablet-mode');
        container.classList.add(mode + '-mode');

        // Mostra container e loading
        container.classList.remove('hidden');
        loadingOverlay.classList.remove('hidden');
        errorOverlay.classList.add('hidden');

        // Carica iframe
        loadFrame(url);

        console.log('[PLOS Bridge] Aperto in modalità:', mode);
    }

    function closePLOS() {
        if (!isOpen) return;

        // Nascondi
        container.classList.add('hidden');
        
        // Reset iframe
        frame.src = 'about:blank';

        // Reset state
        isOpen = false;
        currentMode = null;
        currentUrl = null;
        handshakeToken = null;

        // Notifica FiveM
        fetch('https://plos_bridge/PLOS_CLOSE', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        console.log('[PLOS Bridge] Chiuso');
    }

    // ============================================
    // FRAME LOADING
    // ============================================

    function loadFrame(url) {
        // Timeout per errore
        const loadTimeout = setTimeout(function() {
            showError('Timeout di caricamento');
        }, 10000);

        frame.onload = function() {
            clearTimeout(loadTimeout);
            
            // Nascondi loading
            loadingOverlay.classList.add('hidden');
            
            // Setup comunicazione con iframe
            setupIframeCommunication();
            
            // Notifica FiveM che NUI è pronta
            fetch('https://plos_bridge/PLOS_READY', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            console.log('[PLOS Bridge] Frame caricato');
        };

        frame.onerror = function() {
            clearTimeout(loadTimeout);
            showError('Impossibile caricare la pagina');
        };

        // Carica URL
        frame.src = url;
    }

    function showError(message) {
        loadingOverlay.classList.add('hidden');
        errorOverlay.classList.remove('hidden');
        errorMessage.textContent = message;
    }

    // ============================================
    // IFRAME COMMUNICATION
    // ============================================

    function setupIframeCommunication() {
        // Ascolta messaggi dall'iframe (PURE LIFE OS)
        window.addEventListener('message', handleIframeMessage);
    }

    function handleIframeMessage(event) {
        // Verifica origine (in produzione, verificare dominio)
        const data = event.data;
        
        if (!data || !data.type || !data.type.startsWith('PLOS_')) return;

        console.log('[PLOS Bridge] Messaggio da iframe:', data.type);

        switch (data.type) {
            case 'PLOS_REQUEST_PLAYER':
                requestPlayerData();
                break;
                
            case 'PLOS_SET_WAYPOINT':
                setWaypoint(data.x, data.y);
                break;
                
            case 'PLOS_NOTIFY':
                showNotify(data.title, data.message, data.notifyType);
                break;
                
            case 'PLOS_HANDSHAKE':
                requestHandshake();
                break;
                
            case 'PLOS_CLOSE':
                closePLOS();
                break;
                
            case 'PLOS_OPEN_MAP':
                openMap();
                break;
                
            case 'PLOS_GET_POSITION':
                getPosition(data.requestId);
                break;
                
            case 'PLOS_GET_STREET':
                getStreet(data.requestId);
                break;
                
            case 'PLOS_COPY':
                copyToClipboard(data.text);
                break;
                
            case 'PLOS_LINK_ACCOUNT':
                linkFiveMAccount(data.user_id, data.auth_token);
                break;
                
            case 'PLOS_GET_LINK_STATUS':
                getLinkStatus();
                break;
        }
    }

    function sendToIframe(type, data) {
        if (!frame.contentWindow) return;
        
        frame.contentWindow.postMessage({
            type: type,
            ...data
        }, '*');
    }

    // ============================================
    // NUI CALLBACKS
    // ============================================

    async function requestPlayerData() {
        try {
            const response = await fetch('https://plos_bridge/PLOS_GET_PLAYER', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const result = await response.json();
            
            if (result.success) {
                playerData = result.data;
                sendToIframe('PLOS_PLAYER_DATA', { data: result.data });
            } else {
                sendToIframe('PLOS_PLAYER_DATA', { error: result.error });
            }
        } catch (error) {
            console.error('[PLOS Bridge] Errore requestPlayerData:', error);
            sendToIframe('PLOS_PLAYER_DATA', { error: 'Request failed' });
        }
    }

    async function setWaypoint(x, y) {
        try {
            const response = await fetch('https://plos_bridge/PLOS_SET_WAYPOINT', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x: x, y: y })
            });
            const result = await response.json();
            
            sendToIframe('PLOS_WAYPOINT_RESULT', { success: result.success });
        } catch (error) {
            console.error('[PLOS Bridge] Errore setWaypoint:', error);
            sendToIframe('PLOS_WAYPOINT_RESULT', { success: false, error: 'Request failed' });
        }
    }

    async function showNotify(title, message, type) {
        try {
            await fetch('https://plos_bridge/PLOS_NOTIFY', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: title, 
                    message: message, 
                    type: type || 'info' 
                })
            });
        } catch (error) {
            console.error('[PLOS Bridge] Errore showNotify:', error);
        }
    }

    async function requestHandshake() {
        try {
            const response = await fetch('https://plos_bridge/PLOS_HANDSHAKE', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const result = await response.json();
            
            // Il risultato arriverà tramite HANDSHAKE_RESULT
            console.log('[PLOS Bridge] Handshake richiesto:', result);
        } catch (error) {
            console.error('[PLOS Bridge] Errore requestHandshake:', error);
            sendToIframe('PLOS_HANDSHAKE_RESULT', { success: false, error: 'Request failed' });
        }
    }

    async function openMap() {
        try {
            await fetch('https://plos_bridge/PLOS_OPEN_MAP', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
        } catch (error) {
            console.error('[PLOS Bridge] Errore openMap:', error);
        }
    }

    async function getPosition(requestId) {
        try {
            const response = await fetch('https://plos_bridge/PLOS_GET_POSITION', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const result = await response.json();
            
            sendToIframe('PLOS_POSITION_RESULT', { 
                requestId: requestId,
                success: result.success, 
                data: result.data 
            });
        } catch (error) {
            sendToIframe('PLOS_POSITION_RESULT', { 
                requestId: requestId,
                success: false, 
                error: 'Request failed' 
            });
        }
    }

    async function getStreet(requestId) {
        try {
            const response = await fetch('https://plos_bridge/PLOS_GET_STREET', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const result = await response.json();
            
            sendToIframe('PLOS_STREET_RESULT', { 
                requestId: requestId,
                success: result.success, 
                data: result.data 
            });
        } catch (error) {
            sendToIframe('PLOS_STREET_RESULT', { 
                requestId: requestId,
                success: false, 
                error: 'Request failed' 
            });
        }
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            
            await fetch('https://plos_bridge/PLOS_COPY_TO_CLIPBOARD', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });
            
            sendToIframe('PLOS_COPY_RESULT', { success: true });
        } catch (error) {
            sendToIframe('PLOS_COPY_RESULT', { success: false, error: 'Copy failed' });
        }
    }

    // ============================================
    // FIVEM ACCOUNT AUTO-LINK
    // ============================================

    async function linkFiveMAccount(userId, authToken) {
        try {
            console.log('[PLOS Bridge] Auto-link account FiveM per user:', userId);
            
            const response = await fetch('https://plos_bridge/PLOS_LINK_ACCOUNT', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    auth_token: authToken
                })
            });
            const result = await response.json();
            
            sendToIframe('PLOS_LINK_RESULT', {
                success: result.success,
                message: result.message || '',
                error: result.error || ''
            });
            
            console.log('[PLOS Bridge] Auto-link risultato:', result);
        } catch (error) {
            console.error('[PLOS Bridge] Errore auto-link:', error);
            sendToIframe('PLOS_LINK_RESULT', {
                success: false,
                error: 'Errore collegamento: ' + error.message
            });
        }
    }

    async function getLinkStatus() {
        try {
            const response = await fetch('https://plos_bridge/PLOS_GET_LINK_STATUS', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const result = await response.json();
            
            sendToIframe('PLOS_LINK_STATUS', {
                linked: result.linked,
                identifier: result.identifier,
                identifiers: result.identifiers
            });
        } catch (error) {
            console.error('[PLOS Bridge] Errore check link status:', error);
            sendToIframe('PLOS_LINK_STATUS', {
                linked: false,
                error: 'Errore: ' + error.message
            });
        }
    }

    // ============================================
    // HANDLERS
    // ============================================

    function handlePushNotification(payload) {
        sendToIframe('PLOS_PUSH_NOTIFICATION', payload);
    }

    function handlePlayerContextUpdate(payload) {
        playerData = payload;
        sendToIframe('PLOS_PLAYER_CONTEXT_UPDATED', { data: payload });
    }

    function handleHandshakeResult(success, data) {
        if (success && data.code) {
            // Invia codice all'iframe per completare handshake con backend
            sendToIframe('PLOS_HANDSHAKE_CODE', {
                code: data.code,
                endpoint: data.endpoint,
                expiry: data.expiry
            });
        } else {
            sendToIframe('PLOS_HANDSHAKE_RESULT', {
                success: false,
                error: data.error || 'Handshake failed'
            });
        }
    }

    // ============================================
    // BUTTON HANDLERS
    // ============================================

    retryBtn.addEventListener('click', function() {
        if (currentUrl) {
            errorOverlay.classList.add('hidden');
            loadingOverlay.classList.remove('hidden');
            loadFrame(currentUrl);
        }
    });

    closeErrorBtn.addEventListener('click', function() {
        closePLOS();
    });

    // ============================================
    // KEYBOARD HANDLER
    // ============================================

    document.addEventListener('keydown', function(event) {
        if (!isOpen) return;

        if (event.key === 'Escape') {
            closePLOS();
        }
    });

    // ============================================
    // INIT
    // ============================================

    console.log('[PLOS Bridge] NUI Script inizializzato');

})();
