document.addEventListener("DOMContentLoaded", () => {
    const taskInput = document.getElementById('task-input');
    const runBtn = document.getElementById('run-btn');
    const clearBtn = document.getElementById('clear-btn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const groqKeyInput = document.getElementById('groqKeyInput');
    const openaiKeyInput = document.getElementById('openaiKeyInput');
    const anthropicKeyInput = document.getElementById('anthropicKeyInput');
    const chatBox = document.getElementById('chat-box');
    const themeToggle = document.getElementById('theme-toggle');

    let conversationHistory = [];
    let currentAgentMessageDiv = null;
    let currentSessionId = null;

    // --- MARKED.JS CONFIGURATION (SYNTAX HIGHLIGHTING) ---
    const renderer = new marked.Renderer();
    renderer.code = function(code, language) {
        if (!code) code = "";
        const validLanguage = (language && hljs.getLanguage(language)) ? language : 'plaintext';
        let highlighted = code;
        try {
            highlighted = hljs.highlight(code, { language: validLanguage }).value;
        } catch(e) {}
        return `<div class="code-block-wrapper">
                  <div class="code-header">
                      <span class="code-lang">${validLanguage}</span>
                      <button class="copy-code-btn" onclick="copyToClipboard(this)">
                          <i class="fa-regular fa-copy"></i> Kopyala
                      </button>
                  </div>
                  <pre><code class="hljs ${validLanguage}">${highlighted}</code></pre>
                </div>`;
    };
    marked.setOptions({ renderer: renderer });

    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.className = savedTheme + '-theme';
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.className === 'dark-theme';
        const newTheme = isDark ? 'light' : 'dark';
        document.body.className = newTheme + '-theme';
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        themeToggle.innerHTML = theme === 'dark' 
            ? '<i class="fa-solid fa-sun"></i>' 
            : '<i class="fa-solid fa-moon"></i>';
    }

    taskInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if(this.value === '') this.style.height = 'auto';
    });

    function createMessageWrapper(role) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
        const avatar = document.createElement('div');
        avatar.className = `avatar ${role}`;
        avatar.innerHTML = role === 'user' ? '<i class="fa-regular fa-user"></i>' : '<i class="fa-solid fa-compass"></i>';
        const content = document.createElement('div');
        content.className = 'message-content';
        wrapper.appendChild(avatar);
        wrapper.appendChild(content);
        chatBox.appendChild(wrapper);
        return content;
    }

    function addLogToAgent(type, text) {
        if (!currentAgentMessageDiv) {
            currentAgentMessageDiv = createMessageWrapper('agent');
        }
        const logBox = document.createElement('div');
        logBox.className = `log-box ${type}`;
        
        let icon = ''; let title = '';
        if(type === 'thought') { icon = 'fa-brain'; title = 'Navi Düşünüyor'; }
        else if(type === 'action') { icon = 'fa-bolt'; title = 'Araç Kullanımı'; }
        else if(type === 'observation') { icon = 'fa-eye'; title = 'Gözlem'; }
        else if(type === 'error') { icon = 'fa-triangle-exclamation'; title = 'Hata'; }
        
        logBox.innerHTML = `
            <div class="log-title"><i class="fa-solid ${icon}"></i> ${title}</div>
            <div>${text.replace(/\n/g, '<br>')}</div>
        `;
        currentAgentMessageDiv.appendChild(logBox);
        scrollToBottom();
    }

    function addFinalAnswer(text) {
        if (!currentAgentMessageDiv) {
            currentAgentMessageDiv = createMessageWrapper('agent');
        }
        const answerBox = document.createElement('div');
        try {
            answerBox.innerHTML = marked.parse(text);
        } catch (e) {
            answerBox.innerHTML = text.replace(/\n/g, '<br>');
        }
        currentAgentMessageDiv.appendChild(answerBox);
        scrollToBottom();
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    clearBtn.addEventListener('click', () => {
        conversationHistory = [];
        currentSessionId = null;
        chatBox.innerHTML = `
            <div class="welcome-screen">
                <div class="welcome-icon-box">
                    <i class="fa-solid fa-compass"></i>
                </div>
                <h1>Yeni Bir Sayfa Açtınız</h1>
                <p>Navi hazır. Hangi konuyu keşfetmek istersiniz?</p>
            </div>
        `;
    });

    runBtn.addEventListener('click', async () => {
        const question = taskInput.value.trim();
        if (!question) return;

        const welcome = document.querySelector('.welcome-screen');
        if (welcome) welcome.remove();

        runBtn.disabled = true;
        runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        taskInput.disabled = true;
        
        const userContent = createMessageWrapper('user');
        userContent.innerHTML = `<p>${question}</p>`;
        
        currentAgentMessageDiv = null;

        const typingWrapper = createMessageWrapper('agent');
        typingWrapper.id = "typing-indicator-wrapper";
        typingWrapper.innerHTML = `
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        `;
        scrollToBottom();

        try {
            const response = await fetch('/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question: question, 
                    api_key: apiKeyInput ? apiKeyInput.value.trim() : "",
                    groq_key: groqKeyInput ? groqKeyInput.value.trim() : "",
                    openai_key: openaiKeyInput ? openaiKeyInput.value.trim() : "",
                    anthropic_key: anthropicKeyInput ? anthropicKeyInput.value.trim() : "",
                    history: conversationHistory,
                    session_id: currentSessionId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                addLogToAgent('error', errorData.error || 'Bilinmeyen bir hata oluştu.');
                resetUI();
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let finalAnswer = "";
            let isFirstChunk = true;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                if (isFirstChunk) {
                    const ti = document.getElementById("typing-indicator-wrapper");
                    if (ti) ti.remove();
                    isFirstChunk = false;
                }

                buffer += decoder.decode(value, { stream: true });
                let lines = buffer.split("\n\n");
                buffer = lines.pop(); 

                for (let line of lines) {
                    if (line.startsWith("data: ")) {
                        const jsonStr = line.replace("data: ", "");
                        try {
                            const data = JSON.parse(jsonStr);
                            
                            if (data.type === 'thought') {
                                if (data.content.includes('Answer:')) {
                                    let answerText = data.content.split('Answer:')[1].trim();
                                    addFinalAnswer(answerText);
                                    finalAnswer += data.content + "\n";
                                } else {
                                    addLogToAgent('thought', data.content);
                                    finalAnswer += data.content + "\n";
                                }
                            }
                            else if (data.type === 'action' || data.type === 'observation' || data.type === 'error') {
                                addLogToAgent(data.type, data.content);
                            }
                            else if (data.type === 'session_id') {
                                if (!currentSessionId && data.content) {
                                    currentSessionId = data.content;
                                    loadChatHistory();
                                }
                            }

                        } catch (e) {}
                    }
                }
            }

            conversationHistory.push({ role: 'user', content: question });
            conversationHistory.push({ role: 'model', content: finalAnswer });

        } catch (error) {
            const ti = document.getElementById("typing-indicator-wrapper");
            if (ti) ti.remove();
            addLogToAgent('error', `Bağlantı Hatası: ${error.message}`);
        } finally {
            resetUI();
        }
    });

    function resetUI() {
        runBtn.disabled = false;
        runBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        taskInput.disabled = false;
        taskInput.value = ''; 
        taskInput.style.height = 'auto';
        taskInput.focus();
    }
    
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            runBtn.click();
        }
    });

    const loginModalBtn = document.getElementById("login-modal-btn");
    const authModal = document.getElementById("auth-modal");
    const modalCloseBtn = document.getElementById("modal-close-btn");
    const tabBtns = document.querySelectorAll(".tab-btn");
    const authForms = document.querySelectorAll(".auth-form");

    if (loginModalBtn && authModal) {
        loginModalBtn.addEventListener("click", () => authModal.classList.add("show"));
        modalCloseBtn.addEventListener("click", () => authModal.classList.remove("show"));
        authModal.addEventListener("click", (e) => {
            if (e.target === authModal) authModal.classList.remove("show");
        });
        
        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                tabBtns.forEach(b => b.classList.remove("active"));
                authForms.forEach(f => f.classList.remove("active"));
                btn.classList.add("active");
                document.getElementById(btn.getAttribute("data-target")).classList.add("active");
            });
        });
    }

    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    
    if (registerForm) {
        const btn = registerForm.querySelector("button");
        btn.onclick = async () => {
            const fullname = registerForm.querySelector("input[type='text']").value;
            const email = registerForm.querySelector("input[type='email']").value;
            const password = registerForm.querySelector("input[type='password']").value;
            
            const res = await fetch("/api/register", {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({fullname, email, password})
            });
            const data = await res.json();
            alert(data.message || data.error);
            if(data.success) {
                tabBtns[0].click();
            }
        };
    }

    if (loginForm) {
        const btn = loginForm.querySelector("button");
        btn.onclick = async () => {
            const email = loginForm.querySelector("input[type='email']").value;
            const password = loginForm.querySelector("input[type='password']").value;
            
            const res = await fetch("/api/login", {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({email, password})
            });
            const data = await res.json();
            if(data.success) {
                authModal.classList.remove("show");
            
    // --- RAG FILE UPLOAD LOGIC ---
    const attachBtn = document.getElementById('attach-btn');
    const fileUpload = document.getElementById('file-upload');
    const filePillContainer = document.getElementById('file-pill-container');
    const filePillName = document.getElementById('file-pill-name');

    if (attachBtn && fileUpload) {
        attachBtn.addEventListener('click', () => {
            fileUpload.click();
        });

        fileUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const originalIcon = attachBtn.innerHTML;
            attachBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            attachBtn.disabled = true;
            taskInput.disabled = true;

            const formData = new FormData();
            formData.append('file', file);
            if (currentSessionId) {
                formData.append('session_id', currentSessionId);
            }

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                
                if (data.success) {
                    if (!currentSessionId && data.session_id) {
                        currentSessionId = data.session_id;
                        loadChatHistory();
                    }
                    filePillContainer.style.display = 'flex';
                    filePillName.innerText = data.filename;
                    addLogToAgent('action', `Belge ba?ar?yla haf?zaya al?nd?: ${data.filename}`);
                } else {
                    addLogToAgent('error', `Belge y?kleme ba?ar?s?z: ${data.error}`);
                }
            } catch (error) {
                addLogToAgent('error', `Y?kleme hatas?: ${error.message}`);
            } finally {
                attachBtn.innerHTML = originalIcon;
                attachBtn.disabled = false;
                taskInput.disabled = false;
                fileUpload.value = '';
            }
        });
    }

    // Hide file pill on new chat
    const originalClearBtnClick = clearBtn.onclick;
    clearBtn.addEventListener('click', () => {
        if (filePillContainer) filePillContainer.style.display = 'none';
    });


    checkAuthStatus();
            } else {
                alert(data.error);
            }
        };
    }

    async function checkAuthStatus() {
        const res = await fetch("/api/me");
        const data = await res.json();
        
        const headerRight = document.querySelector(".header-right");
        if(data.logged_in) {
            headerRight.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-weight:600; font-size:14px; color:var(--text-primary)">${data.fullname}</span>
                    <button id="logout-btn" class="pill-btn" style="background:transparent; border-color:var(--danger); color:var(--danger)">Çıkış</button>
                </div>
            `;
            document.getElementById("logout-btn").onclick = async () => {
                await fetch("/api/logout", {method:"POST"});
                window.location.reload();
            };
            loadChatHistory();
        }
    }

    async function loadChatHistory() {
        const res = await fetch("/api/chats");
        if(!res.ok) return;
        const chats = await res.json();
        
        const list = document.querySelector(".chat-history-list");
        if(list) {
            list.innerHTML = "";
            chats.forEach(c => {
                const li = document.createElement("li");
                li.className = "history-item";
                li.style.display = "flex";
                li.style.justifyContent = "space-between";
                li.style.alignItems = "center";
                
                const titleSpan = document.createElement("span");
                titleSpan.innerHTML = `<i class="fa-regular fa-message"></i> ${c.title}`;
                titleSpan.style.flex = "1";
                titleSpan.style.overflow = "hidden";
                titleSpan.style.textOverflow = "ellipsis";
                titleSpan.style.whiteSpace = "nowrap";
                
                const actionsDiv = document.createElement("div");
                actionsDiv.style.display = "flex";
                actionsDiv.style.gap = "4px";

                const editBtn = document.createElement("button");
                editBtn.innerHTML = `<i class="fa-solid fa-pen"></i>`;
                editBtn.className = "edit-chat-btn";
                editBtn.title = "Yeniden Adlandır";

                const delBtn = document.createElement("button");
                delBtn.innerHTML = `<i class="fa-solid fa-trash"></i>`;
                delBtn.className = "delete-chat-btn";
                delBtn.title = "Sohbeti Sil";
                
                actionsDiv.appendChild(editBtn);
                actionsDiv.appendChild(delBtn);

                li.appendChild(titleSpan);
                li.appendChild(actionsDiv);
                
                li.onclick = (e) => {
                    if (e.target.closest('.delete-chat-btn') || e.target.closest('.edit-chat-btn')) {
                        return; // handled below
                    }
                    loadChat(c.id);
                };

                editBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const newTitle = prompt("Sohbetin yeni adını girin:", c.title);
                    if (newTitle && newTitle.trim() !== "" && newTitle !== c.title) {
                        const editRes = await fetch("/api/chats/" + c.id, { 
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ title: newTitle.trim() })
                        });
                        if (editRes.ok) {
                            loadChatHistory();
                        }
                    }
                };
                
                delBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if(confirm("Bu sohbeti silmek istediğinize emin misiniz?")) {
                        const delRes = await fetch("/api/chats/" + c.id, { method: "DELETE" });
                        if(delRes.ok) {
                            if (currentSessionId === c.id) {
                                document.getElementById("clear-btn").click();
                            }
                            loadChatHistory();
                        }
                    }
                };

                list.appendChild(li);
            });
        }
    }

    async function loadChat(id) {
        const res = await fetch("/api/chats/" + id);
        if(!res.ok) return;
        const msgs = await res.json();
        
        currentSessionId = id;
        chatBox.innerHTML = "";
        
        msgs.forEach(m => {
            const contentDiv = createMessageWrapper(m.role);
            if(m.role === 'user') {
                contentDiv.innerHTML = `<p>${m.content}</p>`;
            } else {
                try {
                    contentDiv.innerHTML = marked.parse(m.content);
                } catch (e) {
                    contentDiv.innerHTML = m.content.replace(/\n/g, '<br>');
                }
            }
        });
        scrollToBottom();
    }

    // --- RAG FILE UPLOAD LOGIC ---
    const attachBtn = document.getElementById('attach-btn');
    const fileUpload = document.getElementById('file-upload');
    const filePillContainer = document.getElementById('file-pill-container');
    const filePillName = document.getElementById('file-pill-name');

    if (attachBtn && fileUpload) {
        attachBtn.addEventListener('click', () => {
            fileUpload.click();
        });

        fileUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const originalIcon = attachBtn.innerHTML;
            attachBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            attachBtn.disabled = true;
            taskInput.disabled = true;

            const formData = new FormData();
            formData.append('file', file);
            if (currentSessionId) {
                formData.append('session_id', currentSessionId);
            }

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                
                if (data.success) {
                    if (!currentSessionId && data.session_id) {
                        currentSessionId = data.session_id;
                        loadChatHistory();
                    }
                    filePillContainer.style.display = 'flex';
                    filePillName.innerText = data.filename;
                    addLogToAgent('action', `Belge başarıyla hafızaya alındı: ${data.filename}`);
                } else {
                    addLogToAgent('error', `Belge yükleme başarısız: ${data.error}`);
                }
            } catch (error) {
                addLogToAgent('error', `Yükleme hatası: ${error.message}`);
            } finally {
                attachBtn.innerHTML = originalIcon;
                attachBtn.disabled = false;
                taskInput.disabled = false;
                fileUpload.value = '';
            }
        });
    }

    // Hide file pill on new chat
    const originalClearBtnClick = clearBtn.onclick;
    clearBtn.addEventListener('click', () => {
        if (filePillContainer) filePillContainer.style.display = 'none';
    });

    const resizer = document.getElementById("drag-handle");
    const sidebar = document.querySelector(".sidebar");
    
    if (resizer && sidebar) {
        let isResizing = false;
        resizer.addEventListener("mousedown", (e) => {
            isResizing = true;
            document.body.style.cursor = "col-resize";
            e.preventDefault(); 
        });
        document.addEventListener("mousemove", (e) => {
            if (!isResizing) return;
            let newWidth = e.clientX;
            if (newWidth < 200) newWidth = 200;
            if (newWidth > 500) newWidth = 500;
            sidebar.style.width = newWidth + "px";
        });
        document.addEventListener("mouseup", () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = "default";
            }
        });
    }

    const settingsModalBtn = document.getElementById("settings-modal-btn");
    const settingsModal = document.getElementById("settings-modal");
    const settingsCloseBtn = document.getElementById("settings-close-btn");

    if (settingsModalBtn && settingsModal) {
        settingsModalBtn.addEventListener("click", () => settingsModal.classList.add("show"));
        settingsCloseBtn.addEventListener("click", () => settingsModal.classList.remove("show"));
        settingsModal.addEventListener("click", (e) => {
            if (e.target === settingsModal) settingsModal.classList.remove("show");
        });
    }
});

// --- GLOBAL COPY FUNCTION ---
window.copyToClipboard = function(btn) {
    const wrapper = btn.closest('.code-block-wrapper');
    const code = wrapper.querySelector('code').innerText;
    
    navigator.clipboard.writeText(code).then(() => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Kopyalandı';
        btn.style.color = '#4ade80';
        
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.style.color = '#ccc';
        }, 2000);
    });
};
