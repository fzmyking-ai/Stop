import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, push, onChildAdded, onChildRemoved, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

console.log("🟢 Iniciando chat.js...");

// ==========================================
// 1. ÁUDIO DE NOTIFICAÇÃO
// ==========================================
// Som leve de "pop" para mensagens recebidas
const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
notificationSound.volume = 0.5; // Ajuste o volume se precisar

// ==========================================
// 2. ESTILOS DO CHAT
// ==========================================
const chatCSS = `
    #chat-fab {
        position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
        background: linear-gradient(45deg, var(--secondary), var(--primary));
        border-radius: 50%; display: none; justify-content: center; align-items: center;
        font-size: 28px; box-shadow: 0 5px 20px rgba(0,0,0,0.6), inset 0 0 10px rgba(255,255,255,0.2);
        cursor: pointer; z-index: 99999;
        transition: transform 0.2s, opacity 0.3s;
    }
    #chat-fab:active { transform: scale(0.9); }
    #chat-badge {
        position: absolute; top: -5px; right: -5px; background: var(--danger, #ff1744); color: white;
        font-size: 12px; font-weight: 800; width: 22px; height: 22px; border-radius: 50%;
        display: none; justify-content: center; align-items: center; box-shadow: 0 0 10px rgba(255, 23, 68, 0.8);
    }
    
    @keyframes popIn { 
        0% { opacity: 0; transform: scale(0.9) translateY(20px); } 
        100% { opacity: 1; transform: scale(1) translateY(0); } 
    }
    
    #chat-panel {
        position: fixed; bottom: 90px; right: 20px; width: 350px; max-width: 90vw; height: 450px; max-height: 70vh;
        background: var(--surface, rgba(30,30,30,0.9)); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
        border: 1px solid var(--glass-border, rgba(255,255,255,0.1)); border-radius: 20px; display: none; flex-direction: column;
        z-index: 99998; box-shadow: 0 10px 40px rgba(0,0,0,0.8); overflow: hidden; 
        animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    
    #chat-header {
        background: rgba(0,0,0,0.4); padding: 15px; display: flex; justify-content: space-between;
        align-items: center; border-bottom: 1px solid var(--glass-border, rgba(255,255,255,0.1)); font-weight: bold; color: var(--primary, #4caf50);
    }
    #chat-close { background: rgba(255,255,255,0.1); border: none; color: white; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-weight: bold; transition: 0.2s; }
    #chat-close:hover { background: rgba(255,255,255,0.3); }
    
    #chat-login-view, #chat-messages-view { flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; }
    #chat-messages-view { display: none; }
    
    #chat-login-view { padding: 20px; text-align: center; justify-content: center; align-items: center; gap: 10px; }
    #chat-login-view h3 { color: white; font-size: 1.1rem; margin-bottom: 5px; }
    #chat-login-view p { color: #ccc; font-size: 0.85rem; margin-bottom: 15px; }
    
    .btn-google {
        width: 100%; padding: 12px; border-radius: 12px; border: none; font-weight: bold;
        font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: 0.2s;
        background: white; color: #333;
    }
    .btn-google:active { transform: scale(0.95); }
    .btn-google img { width: 18px; height: 18px; }

    @keyframes slideInMsg { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }

    #chat-messages { flex-grow: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
    .msg-bubble { 
        max-width: 85%; padding: 10px 15px; border-radius: 15px; font-size: 0.9rem; line-height: 1.4; 
        word-wrap: break-word; position: relative; animation: slideInMsg 0.3s ease-out;
        touch-action: pan-y; transition: transform 0.2s ease-out; 
    }
    .msg-others { background: rgba(0,0,0,0.5); color: white; align-self: flex-start; border-bottom-left-radius: 5px; border: 1px solid rgba(255,255,255,0.05); }
    .msg-self { background: linear-gradient(45deg, var(--secondary, #2196F3), var(--primary, #4CAF50)); color: white; align-self: flex-end; border-bottom-right-radius: 5px; padding-bottom: 20px; }
    .msg-name { font-size: 0.7rem; font-weight: 800; margin-bottom: 3px; opacity: 0.8; }
    
    /* Botão de Deletar */
    .btn-delete-msg {
        position: absolute; bottom: 5px; right: 8px; background: none; border: none; 
        color: rgba(255,255,255,0.6); font-size: 0.8rem; cursor: pointer; padding: 2px;
    }
    .btn-delete-msg:hover { color: white; }

    /* Área de Reply (Resposta) */
    .reply-quote { font-size: 0.75rem; background: rgba(0,0,0,0.2); padding: 6px; border-left: 3px solid rgba(255,255,255,0.5); border-radius: 4px; margin-bottom: 5px; opacity: 0.9; }
    #reply-preview { display: none; background: rgba(0,0,0,0.6); padding: 8px 15px; font-size: 0.8rem; color: #ccc; border-top: 1px solid var(--glass-border, rgba(255,255,255,0.1)); justify-content: space-between; align-items: center; }
    #reply-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 85%; }
    #close-reply { background: none; border: none; color: white; font-size: 1rem; cursor: pointer; }

    #chat-input-area { display: flex; padding: 10px; background: rgba(0,0,0,0.3); border-top: 1px solid var(--glass-border, rgba(255,255,255,0.1)); gap: 10px; }
    #chat-input-area input { margin: 0; padding: 12px; font-size: 0.9rem !important; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5); color: white; width: 100%; outline: none; }
    #chat-input-area input:focus { border-color: var(--primary, #4caf50); }
    #chat-send { background: var(--success, #4CAF50); border: none; color: white; border-radius: 50%; width: 45px; height: 45px; cursor: pointer; display: flex; justify-content: center; align-items: center; font-size: 1.2rem; flex-shrink: 0; transition: transform 0.1s;}
    #chat-send:active { transform: scale(0.9); }

    @media (max-width: 600px) {
        #chat-panel { right: 0; bottom: 0; width: 100vw; max-width: 100vw; height: 60vh; border-radius: 20px 20px 0 0; }
    }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = chatCSS;
document.head.appendChild(styleSheet);

// ==========================================
// 3. ESTRUTURA HTML DO CHAT
// ==========================================
const chatContainer = document.createElement("div");
chatContainer.innerHTML = `
    <div id="chat-fab">💬<span id="chat-badge">0</span></div>
    
    <div id="chat-panel">
        <div id="chat-header">
            <span id="chat-header-text">💬 Chat</span>
            <button id="chat-close">✖</button>
        </div>
        
        <div id="chat-login-view">
            <h3>Login Necessário</h3>
            <p>Faça login com sua conta do Google para interagir na sala.</p>
            <button class="btn-google" id="btn-login-google">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google">
                Entrar com Google
            </button>
        </div>

        <div id="chat-messages-view">
            <div id="chat-messages"></div>
            <div id="reply-preview">
                <span id="reply-text"></span>
                <button id="close-reply">✖</button>
            </div>
            <div id="chat-input-area">
                <input type="text" id="chat-input" placeholder="Digite uma mensagem..." maxlength="120" autocomplete="off">
                <button id="chat-send">➤</button>
            </div>
        </div>
    </div>
`;
document.body.appendChild(chatContainer);

// ==========================================
// 4. LÓGICA DO CHAT & AUTH
// ==========================================
const fab = document.getElementById('chat-fab');
const panel = document.getElementById('chat-panel');
const btnClose = document.getElementById('chat-close');
const btnSend = document.getElementById('chat-send');
const inputMsg = document.getElementById('chat-input');
const messagesContainer = document.getElementById('chat-messages');
const badge = document.getElementById('chat-badge');
const loginView = document.getElementById('chat-login-view');
const messagesView = document.getElementById('chat-messages-view');
const btnLoginGoogle = document.getElementById('btn-login-google');
const chatHeaderText = document.getElementById('chat-header-text');

// Elementos do Reply (Responder)
const replyPreview = document.getElementById('reply-preview');
const replyText = document.getElementById('reply-text');
const closeReplyBtn = document.getElementById('close-reply');

let isChatOpen = false;
let unreadCount = 0;
let activeRoom = "";
let unsubscribeChatAdded = null;
let unsubscribeChatRemoved = null;
let chatUser = null;
let replyingTo = null; 

// Aguarda os dados do Firebase virem do index.html
const checkFirebaseInterval = setInterval(() => {
    if (window.firebaseApp && window.db) {
        clearInterval(checkFirebaseInterval);
        initChatSystem();
    }
}, 500);

function initChatSystem() {
    console.log("🟢 Conectado ao Firebase! Iniciando lógica do chat...");
    const auth = getAuth(window.firebaseApp);

    // --- SISTEMA DE LOGIN (Apenas Google) ---
    btnLoginGoogle.addEventListener('click', () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch((error) => {
            console.error("Erro no login:", error);
            alert("Erro ao fazer login. Tente novamente.");
        });
    });

    function verificarTelaLogin() {
        if (chatUser) {
            loginView.style.display = 'none';
            messagesView.style.display = 'flex';
            if (activeRoom) loadRoomMessages();
        } else {
            loginView.style.display = 'flex';
            messagesView.style.display = 'none';
            removerListeners();
        }
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            chatUser = { uid: user.uid, name: user.displayName || "Jogador" };
        } else {
            chatUser = null;
        }
        verificarTelaLogin();
    });

    // --- CONTROLE DE INTERFACE ---
    function toggleChat() {
        isChatOpen = !isChatOpen;
        panel.style.display = isChatOpen ? 'flex' : 'none';
        
        fab.style.display = isChatOpen ? 'none' : 'flex'; 

        if (isChatOpen) {
            unreadCount = 0;
            updateBadge();
            scrollToBottom();
            if (chatUser) inputMsg.focus();
        }
    }

    function updateBadge() {
        if (unreadCount > 0) {
            badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    fab.addEventListener('click', toggleChat);
    btnClose.addEventListener('click', toggleChat);

    // --- SISTEMA DE REPLY (RESPONDER) ---
    function setReplyMode(name, text) {
        replyingTo = { name, text };
        replyText.innerHTML = `<strong>${name}:</strong> ${text}`;
        replyPreview.style.display = 'flex';
        inputMsg.focus();
    }

    closeReplyBtn.addEventListener('click', () => {
        replyingTo = null;
        replyPreview.style.display = 'none';
    });

    // --- ENVIO E EXCLUSÃO DE MENSAGENS ---
    async function sendMessage() {
        const text = inputMsg.value.trim();
        if (!text || !window.currentRoom || !chatUser) return;

        inputMsg.value = "";
        inputMsg.focus();

        const messagesRef = ref(window.db, `rooms/${window.currentRoom}/chat`);
        await push(messagesRef, {
            senderId: chatUser.uid,
            senderName: chatUser.name,
            text: text,
            replyTo: replyingTo, 
            timestamp: Date.now()
        });

        replyingTo = null;
        replyPreview.style.display = 'none';
    }

    async function deleteMessage(msgKey) {
        if (!window.currentRoom) return;
        const msgRef = ref(window.db, `rooms/${window.currentRoom}/chat/${msgKey}`);
        await remove(msgRef).catch(e => console.error("Erro ao apagar:", e));
    }

    btnSend.addEventListener('click', sendMessage);
    inputMsg.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // --- RENDERIZAR MENSAGENS ---
    function renderMessage(msg, key) {
        const isMe = chatUser && msg.senderId === chatUser.uid;
        const div = document.createElement('div');
        div.className = `msg-bubble ${isMe ? 'msg-self' : 'msg-others'}`;
        div.dataset.key = key; // Armazena a chave para poder excluir
        
        const nameStr = isMe ? "Você" : msg.senderName;
        
        let replyHTML = '';
        if (msg.replyTo) {
            replyHTML = `<div class="reply-quote"><strong>${msg.replyTo.name}:</strong> ${msg.replyTo.text}</div>`;
        }

        let deleteBtnHTML = isMe ? `<button class="btn-delete-msg" title="Apagar">🗑️</button>` : '';

        div.innerHTML = `<div class="msg-name">${nameStr}</div>${replyHTML}<div>${msg.text}</div>${deleteBtnHTML}`;
        
        // Listener do botão de deletar (se existir)
        if (isMe) {
            div.querySelector('.btn-delete-msg').addEventListener('click', () => deleteMessage(key));
        }

        // Lógica de Swipe para responder (estilo WhatsApp)
        let startX = 0, currentX = 0;
        div.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            div.style.transition = 'none'; 
        }, { passive: true });

        div.addEventListener('touchmove', e => {
            currentX = e.touches[0].clientX - startX;
            if (currentX > 0 && currentX < 80) { div.style.transform = `translateX(${currentX}px)`; }
        }, { passive: true });

        div.addEventListener('touchend', () => {
            div.style.transition = 'transform 0.2s ease-out';
            div.style.transform = 'translateX(0)';
            if (currentX > 45) { setReplyMode(msg.senderName, msg.text); }
            currentX = 0;
        });

        messagesContainer.appendChild(div);
        scrollToBottom();

        // Toca o som APENAS para mensagens recentes de outras pessoas (últimos 5 segundos)
        if (!isMe && (Date.now() - msg.timestamp) < 5000) {
            notificationSound.play().catch(e => console.log("Áudio bloqueado pelo navegador", e));
        }

        if (!isChatOpen && !isMe) {
            unreadCount++;
            updateBadge();
        }
    }

    function removerListeners() {
        if (unsubscribeChatAdded) unsubscribeChatAdded();
        if (unsubscribeChatRemoved) unsubscribeChatRemoved();
    }

    function loadRoomMessages() {
        removerListeners();
        messagesContainer.innerHTML = "";
        unreadCount = 0;
        updateBadge();
        chatHeaderText.innerText = `💬 Chat: ${window.currentRoom}`; // Atualiza o título por sala

        if (chatUser && window.currentRoom) {
            const messagesRef = ref(window.db, `rooms/${window.currentRoom}/chat`);
            
            // Ouvinte para novas mensagens
            unsubscribeChatAdded = onChildAdded(messagesRef, (snapshot) => {
                renderMessage(snapshot.val(), snapshot.key);
            });

            // Ouvinte para mensagens deletadas (sincroniza a exclusão na tela de todos)
            unsubscribeChatRemoved = onChildRemoved(messagesRef, (snapshot) => {
                const deletedDiv = document.querySelector(`.msg-bubble[data-key="${snapshot.key}"]`);
                if (deletedDiv) deletedDiv.remove();
            });
        }
    }

    // ==========================================
    // LOOP PRINCIPAL (GERENCIA SALA ATIVA)
    // ==========================================
    setInterval(() => {
        if (window.currentRoom && window.currentRoom.length > 0) {
            fab.style.display = isChatOpen ? 'none' : 'flex'; 
        } else {
            fab.style.display = 'none'; 
        }

        if (window.currentRoom && window.currentRoom !== activeRoom) {
            activeRoom = window.currentRoom;
            loadRoomMessages();
        } else if (!window.currentRoom && activeRoom) {
            activeRoom = "";
            chatHeaderText.innerText = `💬 Chat`;
            if (isChatOpen) toggleChat(); 
            messagesContainer.innerHTML = "";
            removerListeners();
        }
    }, 1000);
}

