var isVoiceInteraction = false;

document.addEventListener("DOMContentLoaded", () => {
// Configure marked.js to use highlight.js
if (typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-'
    });
}
    const taskInput = document.getElementById('task-input');
    const runBtn = document.getElementById('run-btn');
    const clearBtn = document.getElementById('clear-btn');
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
        avatar.innerHTML = role === 'user' ? '<i class="fa-regular fa-user"></i>' : '<i class="fa-solid fa-circle-nodes"></i>';
        const contentContainer = document.createElement('div');
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
        contentContainer.style.gap = '8px';
        contentContainer.style.width = '100%';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        contentContainer.appendChild(content);
        
        if (role === 'agent') {
            const actions = document.createElement('div');
            actions.className = 'message-actions';
            actions.innerHTML = `<button class="icon-btn" title="Sesli Oku" onclick="toggleSpeech(this)"><i class="fa-solid fa-volume-high"></i></button>`;
            contentContainer.appendChild(actions);
        }
        
        wrapper.appendChild(avatar);
        wrapper.appendChild(contentContainer);
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
            answerBox.innerHTML = DOMPurify.sanitize(marked.parse(text));
        } catch (e) {
            answerBox.innerHTML = DOMPurify.sanitize(text.replace(/\n/g, '<br>'));
        }
        currentAgentMessageDiv.appendChild(answerBox);
        addCopyButtons();
        scrollToBottom();
    }

// Function to add copy buttons to code blocks
    function addCopyButtons() {
        document.querySelectorAll('pre').forEach((preBlock) => {
            if (preBlock.querySelector('.copy-code-btn')) return; // Already added
            const btn = document.createElement('button');
            btn.className = 'copy-code-btn';
            btn.innerHTML = '<i class="fa-regular fa-copy"></i> Kopyala';
            btn.onclick = () => {
                const code = preBlock.querySelector('code');
                const text = code ? code.innerText : preBlock.innerText.replace('Kopyala', '').trim();
                navigator.clipboard.writeText(text).then(() => {
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> Kopyalandı';
                    setTimeout(() => { btn.innerHTML = '<i class="fa-regular fa-copy"></i> Kopyala'; }, 2000);
                });
            };
            preBlock.appendChild(btn);
        });
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    clearBtn.addEventListener('click', () => {
        conversationHistory = [];
        currentSessionId = null;
        chatBox.innerHTML = `<div class="welcome-screen" id="welcome-screen"> <div class="welcome-icon-box pulse-animation"> <i class="fa-solid fa-circle-nodes"></i> </div> <h1 class="gradient-text">Merhaba, Ben Navi!</h1> <p>Fikirlerinizi gerçeğe dönüştürmek için tasarlanmış kişisel yapay zeka asistanınızım.<br>Aşağıdaki örneklerden biriyle başlayabilirsiniz:</p> <div class="prompt-suggestions"> <button class="prompt-chip" onclick="document.getElementById('task-input').value=this.innerText; document.getElementById('task-input').focus();">Python ile yılan oyunu yaz</button> <button class="prompt-chip" onclick="document.getElementById('task-input').value=this.innerText; document.getElementById('task-input').focus();">Kara delikler nasıl oluşur?</button> <button class="prompt-chip" onclick="document.getElementById('task-input').value=this.innerText; document.getElementById('task-input').focus();">1'den 100'e kadar asal sayıları bul</button> </div> </div>`;
    });

    runBtn.addEventListener('click', async () => {
        const question = taskInput.value.trim();
        if (question === "") return;
        const welcome = document.getElementById("welcome-screen");
        if(welcome) welcome.style.display = "none";

        runBtn.disabled = true;
        runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        taskInput.disabled = true;
        
        const userContent = createMessageWrapper('user');
        userContent.innerHTML = DOMPurify.sanitize(`<p>${question}</p>`);
        
        currentAgentMessageDiv = null;

        const typingWrapper = createMessageWrapper('agent');
        typingWrapper.id = "typing-indicator-wrapper";
        typingWrapper.innerHTML = `
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        `;
        scrollToBottom();

        const modelChoice = document.getElementById('model-selector') ? document.getElementById('model-selector').value : "auto";

        try {
            const response = await fetch('/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question: question, 
                    history: conversationHistory,
                    session_id: currentSessionId,
                    image: selectedImageBase64,
                    model_choice: modelChoice
                })
            });

            // We can now clear the image since we have already sent the request
            selectedImageBase64 = null;
            if (document.getElementById('image-preview-container')) document.getElementById('image-preview-container').style.display = 'none';
            if (document.getElementById('image-upload')) document.getElementById('image-upload').value = '';

            if (!response.ok) {
                const errorData = await response.json();
                const errorMsg = errorData.error || 'Bilinmeyen bir sunucu hatası oluştu.';
                addLogToAgent('error', errorMsg);
                
                // Ayrıca ana sohbet ekranında göster ki kullanıcı takıldığını düşünmesin
                
                if (typeof msgDiv !== 'undefined') {
                    msgDiv.innerHTML = DOMPurify.sanitize(`<span style="color: red;">❌ Sistem Hatası: ${errorMsg}</span>`);
                } else {
                    const errorDiv = document.createElement("div");
                    errorDiv.className = "message system-message";
                    errorDiv.innerHTML = DOMPurify.sanitize(`<span style="color: red;">❌ Sistem Hatası: ${errorMsg}</span>`);
                    chatBox.appendChild(errorDiv);
                }
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
            
            if (isVoiceInteraction) {
                speakText(finalAnswer);
                isVoiceInteraction = false;
            }

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
        loginModalBtn.addEventListener("click", () => { authModal.classList.add("show"); tabBtns[0].click(); });
        const registerHeaderBtn = document.getElementById("register-header-btn");
        if (registerHeaderBtn) {
            registerHeaderBtn.addEventListener("click", () => {
                authModal.classList.add("show");
                tabBtns[1].click(); // Kayıt ol sekmesine geç
            });
        }
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
        const btn = document.getElementById("do-register-btn") || registerForm.querySelector("button");
        btn.onclick = async () => {
            const fullname = document.getElementById("reg-fullname").value;
            const username = document.getElementById("reg-username").value;
            const email = document.getElementById("reg-email").value;
            const job_title = document.getElementById("reg-jobtitle").value;
            const interests = document.getElementById("reg-interests").value;
            const password = document.getElementById("reg-password").value;
            
            const res = await fetch("/api/register", {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({fullname, username, email, job_title, interests, password})
            });
            const data = await res.json();
            alert(data.message || data.error);
            if(data.success) {
                tabBtns[0].click();
            }
        };
    }

    if (loginForm) {
        const btn = document.getElementById("do-login-btn") || loginForm.querySelector("button");
        btn.onclick = async () => {
            const email = document.getElementById("login-email") ? document.getElementById("login-email").value : loginForm.querySelector("input[type='email']").value;
            const password = document.getElementById("login-password") ? document.getElementById("login-password").value : loginForm.querySelector("input[type='password']").value;
            
            const res = await fetch("/api/login", {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({email, password})
            });
            const data = await res.json();
            if(data.success) {
                authModal.classList.remove("show");
            
    
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
        const welcome = document.getElementById("welcome-screen");
        if(welcome) welcome.style.display = "none";
        
        msgs.forEach(m => {
            const contentDiv = createMessageWrapper(m.role);
            if(m.role === 'user') {
                contentDiv.innerHTML = DOMPurify.sanitize(`<p>${m.content}</p>`);
            } else {
                try {
                    contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(m.content));
                } catch (e) {
                    contentDiv.innerHTML = DOMPurify.sanitize(m.content.replace(/\n/g, '<br>'));
                }
            }
        });
        addCopyButtons();
        scrollToBottom();
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
        settingsModalBtn.addEventListener("click", () => { 
    settingsModal.classList.add("show"); 
    const clearBtn = document.getElementById("clear-memory-btn");
    const memList = document.getElementById("memory-list");
    if (!currentSessionId) {
        if (clearBtn) clearBtn.style.display = "none";
        if (memList) memList.innerHTML = "<li style='text-align:center; color:gray; padding:20px;'><i class='fa-solid fa-lock' style='font-size: 24px; margin-bottom:10px; display:block;'></i>Hafıza özelliklerini görebilmek için giriş yapmalısınız.</li>";
    } else {
        fetchMemories(); 
    }
});
        settingsCloseBtn.addEventListener("click", () => settingsModal.classList.remove("show"));
        settingsModal.addEventListener("click", (e) => {
            if (e.target === settingsModal) settingsModal.classList.remove("show");
        });
    }
// --- ATTACH DROPDOWN & UPLOAD LOGIC ---
  let selectedImageBase64 = null;
  const attachBtn = document.getElementById("attach-btn");
  const attachDropdown = document.getElementById("attach-dropdown");
  const menuImageUpload = document.getElementById("menu-image-upload");
  const menuDocUpload = document.getElementById("menu-doc-upload");
  
  const imageUpload = document.getElementById("image-upload");
  const documentUpload = document.getElementById("document-upload");
  
  const filePillContainer = document.getElementById("file-pill-container");
  const filePillName = document.getElementById("file-pill-name");
  const removeFileBtn = document.getElementById("remove-file-btn");
  
  const imagePreviewContainer = document.getElementById("image-preview-container");
  const imagePreview = document.getElementById("image-preview");
  const removeImageBtn = document.getElementById("remove-image-btn");

  if (attachBtn && attachDropdown) {
      attachBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          attachDropdown.classList.toggle("show");
      });
      
      document.addEventListener("click", (e) => {
          if (!attachBtn.contains(e.target) && !attachDropdown.contains(e.target)) {
              attachDropdown.classList.remove("show");
          }
      });
  }

  if (menuImageUpload && imageUpload) {
      menuImageUpload.addEventListener("click", () => {
          attachDropdown.classList.remove("show");
          imageUpload.click();
      });
      
      imageUpload.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = function(event) {
              selectedImageBase64 = event.target.result;
              if (imagePreviewContainer && imagePreview) {
                  imagePreview.src = selectedImageBase64;
                  imagePreviewContainer.style.display = "block";
              }
              // Hide document pill if it was showing
              if (filePillContainer) filePillContainer.style.display = "none";
          };
          reader.readAsDataURL(file);
      });
  }

  if (menuDocUpload && documentUpload) {
      menuDocUpload.addEventListener("click", () => {
          attachDropdown.classList.remove("show");
          documentUpload.click();
      });
      
      documentUpload.addEventListener("change", async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          // Clear image if it was showing
          selectedImageBase64 = null;
          if (imagePreviewContainer) imagePreviewContainer.style.display = "none";
          
          const originalIcon = attachBtn.innerHTML;
          attachBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
          attachBtn.disabled = true;
  
          const formData = new FormData();
          formData.append("file", file);
          formData.append("session_id", currentSessionId || "");
  
          try {
              const response = await fetch("/api/upload", {
                  method: "POST",
                  body: formData
              });
  
              const data = await response.json();
  
              if (response.ok) {
                  if (filePillContainer && filePillName) {
                      filePillName.textContent = file.name;
                      filePillContainer.style.display = "flex";
                  }
              } else {
                  alert("Dosya yükleme hatası: " + (data.error || "Bilinmeyen hata"));
              }
          } catch (err) {
              console.error(err);
              alert("Dosya yüklenirken bir hata oluştu.");
          } finally {
              attachBtn.innerHTML = originalIcon;
              attachBtn.disabled = false;
              documentUpload.value = "";
          }
      });
  }

  if (removeFileBtn) {
      removeFileBtn.addEventListener("click", () => {
          if (filePillContainer) filePillContainer.style.display = "none";
          if (documentUpload) documentUpload.value = "";
      });
  }
  
  if (removeImageBtn) {
      removeImageBtn.addEventListener("click", () => {
          selectedImageBase64 = null;
          if (imagePreviewContainer) imagePreviewContainer.style.display = "none";
          if (imageUpload) imageUpload.value = "";
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

// --- Memory Functions ---
async function openMemoryModal() { // deprecated

    const modal = document.getElementById("memory-modal");
    if(modal) modal.classList.add("show");
    await fetchMemories();
}

function closeMemoryModal() {
    const modal = document.getElementById("memory-modal");
    if(modal) modal.classList.remove("show");
}

async function fetchMemories() {
    const res = await fetch("/api/memory");
    const list = document.getElementById("memory-list");
    if(!res.ok || !list) return;
    
    const memories = await res.json();
    list.innerHTML = "";
    if(memories.length === 0) {
        list.innerHTML = "<li style='text-align:center; color:gray;'>Hen?z kaydedilmi? bir haf?za yok.</li>";
        return;
    }
    
    memories.forEach(m => {
        const li = document.createElement("li");
        li.className = "memory-item";
        li.innerHTML = `
            <span>${m.fact}</span>
            <button onclick="deleteMemory(${m.id})" title="Sil"><i class="fa-solid fa-trash"></i></button>
        `;
        list.appendChild(li);
    });
}

async function deleteMemory(id) {
    if(confirm("Bu haf?zay? silmek istedi?inize emin misiniz?")) {
        const res = await fetch("/api/memory/" + id, { method: "DELETE" });
        if(res.ok) {
            fetchMemories();
        }
    }
}

async function clearAllMemory() {
    if(confirm("T?m haf?zay? kal?c? olarak silmek istedi?inize emin misiniz? Navi sizi tamamen unutacak.")) {
        const res = await fetch("/api/memory/all", { method: "DELETE" });
        if(res.ok) {
            fetchMemories();
        }
    }
}


// --- MOBILE UI LOGIC ---
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileBackdrop = document.getElementById("mobile-backdrop");
const sidebarEl = document.querySelector(".sidebar");

if (mobileMenuBtn && mobileBackdrop && sidebarEl) {
    function openSidebar() {
        sidebarEl.classList.add("mobile-open");
        mobileBackdrop.classList.add("show");
    }
    
    function closeSidebar() {
        sidebarEl.classList.remove("mobile-open");
        mobileBackdrop.classList.remove("show");
    }
    
    mobileMenuBtn.addEventListener("click", openSidebar);
    mobileBackdrop.addEventListener("click", closeSidebar);
    
    // Auto-close sidebar on mobile when a chat is clicked
    const oldLoadChat = loadChat;
    loadChat = async function(id) {
        await oldLoadChat(id);
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    };
    
    // Auto-close when new chat button is clicked
    const newChatBtnEl = document.getElementById("new-chat-btn");
    if(newChatBtnEl) {
        newChatBtnEl.addEventListener("click", () => {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    }
}


// --- VOICE ASSISTANT (STT & TTS) ---
const voiceBtn = document.getElementById("voice-btn");

if (voiceBtn) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = function() {
            voiceBtn.classList.add("listening");
            taskInput.placeholder = "Dinliyorum...";
            isVoiceInteraction = true;
        };

        recognition.onspeechend = function() {
            recognition.stop();
            voiceBtn.classList.remove("listening");
            taskInput.placeholder = "Navi'ye mesaj g?nder...";
        };

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            taskInput.value = transcript;
            // Trigger send button automatically
            sendBtn.click();
        };

        recognition.onerror = function(event) {
            voiceBtn.classList.remove("listening");
            taskInput.placeholder = "Navi'ye mesaj g?nder...";
            console.error("Speech recognition error:", event.error);
            isVoiceInteraction = false;
        };

        voiceBtn.addEventListener("click", () => {
            if (voiceBtn.classList.contains("listening")) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    } else {
        voiceBtn.style.display = "none";
        console.warn("Tarayici SpeechRecognition API'sini desteklemiyor.");
    }
}

// --- ADVANCED TTS & TOGGLE ---
let currentSpeakingBtn = null;

function toggleSpeech(btn) {
    if (!('speechSynthesis' in window)) return;
    
    if (currentSpeakingBtn === btn && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        btn.style.color = 'var(--text-secondary)';
        currentSpeakingBtn = null;
        return;
    }
    
    window.speechSynthesis.cancel();
    if (currentSpeakingBtn) {
        currentSpeakingBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        currentSpeakingBtn.style.color = 'var(--text-secondary)';
    }
    
    currentSpeakingBtn = btn;
    btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    btn.style.color = '#ef4444'; 
    
    const messageContent = btn.parentElement.previousElementSibling;
    let textToSpeak = "";
    
    for (let node of messageContent.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            textToSpeak += node.textContent + " ";
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (!node.classList.contains('log-box')) {
                textToSpeak += node.innerText + " ";
            }
        }
    }
    textToSpeak = textToSpeak.trim();
    if (!textToSpeak) {
        // Fallback if somehow extraction failed
        textToSpeak = messageContent.innerText; 
    }
    
    setTimeout(() => {
        _doSpeak(textToSpeak, () => {
            if (currentSpeakingBtn === btn) {
                btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                btn.style.color = 'var(--text-secondary)';
                currentSpeakingBtn = null;
            }
        });
    }, 50);
}

function speakText(text) {
    if (currentSpeakingBtn) {
        currentSpeakingBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        currentSpeakingBtn.style.color = 'var(--text-secondary)';
        currentSpeakingBtn = null;
    }
    _doSpeak(text);
}

function _doSpeak(text, onEndCallback) {
    if (!('speechSynthesis' in window)) return;
    
    let cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1') 
                        .replace(/\*(.*?)\*/g, '$1') 
                        .replace(/#(.*?)(\n|$)/g, '$1') 
                        .replace(/\[(.*?)\]\(.*?\)/g, '$1') 
                        .replace(/```[\s\S]*?```/g, 'Kod blogu kaldirildi.') 
                        .replace(/`(.*?)`/g, '$1'); 
                        
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    if (onEndCallback) {
        utterance.onend = onEndCallback;
        utterance.onerror = onEndCallback;
    }
    
    const voices = window.speechSynthesis.getVoices();
    const trVoice = voices.find(v => v.lang.includes('tr') || v.lang.includes('TR'));
    if (trVoice) {
        utterance.voice = trVoice;
    }
    
    // In Chrome, there's a bug where long texts stop halfway. 
    // This is avoided if we don't have further cancel() issues, but let's just speak directly.
    window.speechSynthesis.speak(utterance);
}

// Sidebar Collapse Logic
{
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    const mySidebarEl = document.querySelector('.sidebar');
    if (sidebarToggleBtn && mySidebarEl) {
        sidebarToggleBtn.addEventListener('click', () => {
            mySidebarEl.classList.toggle('collapsed');
        });
    }
}


// --- SPEECH TO TEXT LOGIC (Microphone) ---
document.addEventListener("DOMContentLoaded", () => {
    const voiceBtn = document.getElementById("voice-btn");
    const taskInput = document.getElementById("task-input");
    
    if (voiceBtn) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'tr-TR';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            
            let isRecording = false;
            
            voiceBtn.addEventListener("click", () => {
                if (isRecording) {
                    recognition.stop();
                    return;
                }
                try {
                    recognition.start();
                } catch(e) {
                    console.error("Speech recognition error:", e);
                }
            });
            
            recognition.onstart = () => {
                isRecording = true;
                voiceBtn.classList.add('recording-pulse');
            };
            
            recognition.onresult = (event) => {
                const speechResult = event.results[0][0].transcript;
                if(taskInput.value) {
                    taskInput.value += ' ' + speechResult;
                } else {
                    taskInput.value = speechResult;
                }
                taskInput.dispatchEvent(new Event('input')); // trigger auto-resize
            };
            
            recognition.onspeechend = () => {
                recognition.stop();
            };
            
            recognition.onend = () => {
                isRecording = false;
                voiceBtn.classList.remove('recording-pulse');
            };
            
            recognition.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                isRecording = false;
                voiceBtn.classList.remove('recording-pulse');
            };
        } else {
            voiceBtn.addEventListener("click", () => {
                alert("Tarayıcınız ses tanıma özelliğini desteklemiyor. Lütfen Chrome, Edge veya Safari kullanın.");
            });
        }
    }
});
