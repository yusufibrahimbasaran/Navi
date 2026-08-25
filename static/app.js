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
    let selectedImageBase64 = null;

    // --- MARKED.JS CONFIGURATION (ADVANCED SYNTAX HIGHLIGHTING & LIVE PREVIEW) ---
    const renderer = new marked.Renderer();
    renderer.code = function(code, language) {
        if (!code) code = "";
        const langLower = (language || '').toLowerCase().trim();
        const validLanguage = (language && hljs.getLanguage(language)) ? language : 'plaintext';
        let highlighted = code;
        try {
            highlighted = hljs.highlight(code, { language: validLanguage }).value;
        } catch(e) {
            highlighted = code;
        }

        const lines = highlighted.split('\n');
        // If last line is empty from trailing newline, don't show empty extra number
        if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
        const numberedLines = lines.map((l, i) => `<span class="code-line"><span class="line-num">${i + 1}</span><span class="line-content">${l || ' '}</span></span>`).join('\n');

        const isPreviewable = ['html', 'htm', 'svg', 'xml', 'javascript', 'js', 'css'].includes(langLower);

        return `<div class="code-block-wrapper" data-lang="${langLower}">
                  <div class="code-header">
                      <div class="code-header-left">
                          <span class="code-lang-badge"><i class="fa-solid fa-code"></i> ${validLanguage}</span>
                      </div>
                      <div class="code-header-right">
                          ${isPreviewable ? `<button class="code-header-btn preview-btn" onclick="toggleCodePreview(this)" title="Canlı Önizleme"><i class="fa-solid fa-play"></i> Önizle</button>` : ''}
                          <button class="code-header-btn fullscreen-btn" onclick="toggleCodeFullscreen(this)" title="Tam Ekran"><i class="fa-solid fa-expand"></i></button>
                          <button class="code-header-btn copy-btn" onclick="copyCode(this)" title="Kodu Kopyala"><i class="fa-regular fa-copy"></i> Kopyala</button>
                      </div>
                  </div>
                  <pre><code class="hljs ${validLanguage}">${numberedLines}</code></pre>
                  ${isPreviewable ? `<div class="code-preview-pane" style="display: none;"><iframe class="code-preview-frame" sandbox="allow-scripts"></iframe></div>` : ''}
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

    let currentAgentState = null;
    let activeAbortController = null;

    function createAgentMessageContainer() {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper agent-response-wrapper';
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar agent';
        avatar.innerHTML = '<i class="fa-solid fa-circle-nodes"></i>';
        
        const col = document.createElement('div');
        col.className = 'agent-message-col';
        
        // 1. Canli Departman / Islem Durum Rozeti
        const statusBadge = document.createElement('div');
        statusBadge.className = 'agent-status-badge running';
        statusBadge.innerHTML = `
            <span class="status-pulse-dot"></span>
            <span class="status-badge-text"><i class="fa-solid fa-compass"></i> Yönetici Navi: İstek analiz ediliyor...</span>
            <span class="status-badge-timer">0.0s</span>
        `;
        col.appendChild(statusBadge);

        // 2. Katlanabilir Dusunce ve Islem Sureci Akordeonu
        const details = document.createElement('details');
        details.className = 'thought-accordion';
        details.open = true;
        details.innerHTML = `
            <summary class="thought-summary">
                <div class="summary-left">
                    <i class="fa-solid fa-brain summary-brain-icon"></i>
                    <span class="summary-title">Düşünce ve İşlem Süreci</span>
                    <span class="steps-counter">0 adım</span>
                </div>
                <i class="fa-solid fa-chevron-down toggle-icon"></i>
            </summary>
            <div class="thought-steps-list"></div>
        `;
        col.appendChild(details);

        // 3. Nihai Yanit Alani
        const finalAnswerContainer = document.createElement('div');
        finalAnswerContainer.className = 'final-answer-container message-content';
        col.appendChild(finalAnswerContainer);

        // 4. Eylemler (Sesli Oku vb.)
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        actions.style.display = 'none';
        actions.innerHTML = `<button class="icon-btn" title="Sesli Oku" onclick="toggleSpeech(this)"><i class="fa-solid fa-volume-high"></i></button>`;
        col.appendChild(actions);

        wrapper.appendChild(avatar);
        wrapper.appendChild(col);
        chatBox.appendChild(wrapper);

        const startTime = Date.now();
        const timerEl = statusBadge.querySelector('.status-badge-timer');
        const timerInterval = setInterval(() => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            if (timerEl) timerEl.textContent = `${elapsed}s`;
        }, 100);

        currentAgentState = {
            wrapper,
            col,
            avatar,
            statusBadge,
            statusText: statusBadge.querySelector('.status-badge-text'),
            statusTimer: timerEl,
            details,
            stepsList: details.querySelector('.thought-steps-list'),
            stepsCounter: details.querySelector('.steps-counter'),
            finalAnswerContainer,
            actions,
            startTime,
            timerInterval,
            stepCount: 0,
            accumulatedAnswer: ""
        };

        return currentAgentState;
    }

    function setAgentTheme(agentKey) {
        if (!currentAgentState) return;
        const allAgentClasses = ['agent-sirius', 'agent-orion', 'agent-vega', 'agent-polaris', 'agent-lyra', 'agent-rigel', 'agent-nova', 'agent-reviewer', 'agent-debate'];
        allAgentClasses.forEach(cls => {
            currentAgentState.statusBadge.classList.remove(cls);
            if (currentAgentState.avatar) currentAgentState.avatar.classList.remove(cls);
        });
        if (agentKey) {
            currentAgentState.statusBadge.classList.add(`agent-${agentKey}`);
            if (currentAgentState.avatar) currentAgentState.avatar.classList.add(`agent-${agentKey}`);
        }
    }

    function addDebateStep(speaker, content) {
        if (!currentAgentState) createAgentMessageContainer();
        setAgentTheme('debate');
        
        let arena = currentAgentState.stepsList.querySelector('.debate-arena');
        if (!arena) {
            arena = document.createElement('div');
            arena.className = 'debate-arena';
            arena.innerHTML = `
                <div class="debate-arena-header">
                    <span class="debate-badge"><i class="fa-solid fa-bolt"></i> Münazara Arenası</span>
                    <span class="debate-vs-tag">VS</span>
                </div>
                <div class="debate-arena-grid">
                    <div class="debate-card sirius" id="debate-sirius-card">
                        <div class="debate-card-header">
                            <span class="debate-card-icon sirius"><i class="fa-solid fa-brain"></i></span>
                            <div class="debate-agent-info">
                                <strong>Sirius</strong>
                                <small>Tez / Araştırmacı</small>
                            </div>
                        </div>
                        <div class="debate-card-body"><em>Argüman bekleniyor...</em></div>
                    </div>
                    <div class="debate-card orion" id="debate-orion-card">
                        <div class="debate-card-header">
                            <span class="debate-card-icon orion"><i class="fa-solid fa-code"></i></span>
                            <div class="debate-agent-info">
                                <strong>Orion</strong>
                                <small>Antitez / Yazılımcı</small>
                            </div>
                        </div>
                        <div class="debate-card-body"><em>Argüman bekleniyor...</em></div>
                    </div>
                </div>
            `;
            currentAgentState.stepsList.appendChild(arena);
        }
        
        const cardBody = speaker === 'sirius' 
            ? arena.querySelector('#debate-sirius-card .debate-card-body')
            : arena.querySelector('#debate-orion-card .debate-card-body');
            
        if (cardBody) {
            try {
                cardBody.innerHTML = DOMPurify.sanitize(marked.parse(content));
            } catch(e) {
                cardBody.innerHTML = DOMPurify.sanitize(content.replace(/\n/g, '<br>'));
            }
            renderKaTeX(cardBody);
        }
        
        currentAgentState.stepCount++;
        if (currentAgentState.stepsCounter) {
            currentAgentState.stepsCounter.textContent = `${currentAgentState.stepCount} adım`;
        }
        scrollToBottom();
    }

    function renderKaTeX(element) {
        if (typeof renderMathInElement !== 'undefined' && element) {
            try {
                renderMathInElement(element, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\]', display: true}
                    ],
                    throwOnError: false
                });
            } catch(e) {}
        }
    }

    function addStreamStep(type, text) {
        if (!currentAgentState) {
            createAgentMessageContainer();
        }
        
        currentAgentState.stepCount++;
        if (currentAgentState.stepsCounter) {
            currentAgentState.stepsCounter.textContent = `${currentAgentState.stepCount} adım`;
        }

        let icon = 'fa-brain';
        let title = 'Düşünce';
        let badgeText = '';

        if (type === 'action') {
            icon = 'fa-bolt';
            title = 'Araç / Eylem';
            if (text.includes('Polaris')) { 
                badgeText = '🌟 Polaris (Baş Mimar): Strateji yürütülüyor...'; 
                setAgentTheme('polaris');
            }
            else if (text.includes('Orion')) { 
                badgeText = '💻 Orion (Yazılımcı): Kod çalıştırılıyor...'; 
                setAgentTheme('orion');
            }
            else if (text.includes('Sirius')) { 
                badgeText = '🧠 Sirius (Araştırmacı): Araştırma yapılıyor...'; 
                setAgentTheme('sirius');
            }
            else if (text.includes('Vega')) { 
                badgeText = '📐 Vega (Matematik): Hesaplama yapılıyor...'; 
                setAgentTheme('vega');
            }
            else if (text.includes('Lyra')) { 
                badgeText = '✍️ Lyra (Yazar): İçerik hazırlanıyor...'; 
                setAgentTheme('lyra');
            }
            else if (text.includes('Rigel')) { 
                badgeText = '👁️ Rigel (Görsel Analist): Görüntü taranıyor...'; 
                setAgentTheme('rigel');
            }
            else if (text.includes('Nova')) { 
                badgeText = '💬 Nova (Genel Asistan): Yanıt hazırlanıyor...'; 
                setAgentTheme('nova');
            }
            else if (text.includes('Denetmen')) { 
                badgeText = '🔍 Denetmen (Reviewer): Kalite kontrolü yapılıyor...'; 
                setAgentTheme('reviewer');
            }
            else if (text.includes('Münazara') || text.includes('Debate')) { 
                badgeText = '🎙️ Münazara Arenası: Ajanlar tartışıyor...'; 
                setAgentTheme('debate');
            }
            else if (text.includes('Araç Kullanılıyor')) {
                const toolNameMatch = text.match(/Araç Kullanılıyor:\s*([^\n]+)/);
                const toolName = toolNameMatch ? toolNameMatch[1] : 'Araç';
                badgeText = `⚡ Araç Çalıştırılıyor: ${toolName}`;
            }
        } else if (type === 'observation') {
            icon = 'fa-eye';
            title = 'Gözlem Sonucu';
        } else if (type === 'error') {
            icon = 'fa-triangle-exclamation';
            title = 'Hata';
            badgeText = '❌ Hata Oluştu';
        } else if (type === 'thought') {
            icon = 'fa-brain';
            title = 'Navi Düşünüyor';
        }

        if (badgeText && currentAgentState.statusText) {
            currentAgentState.statusText.innerHTML = badgeText;
        }

        const stepEl = document.createElement('div');
        stepEl.className = `step-item ${type}`;
        
        let sanitizedBody = '';
        try {
            sanitizedBody = DOMPurify.sanitize(marked.parse(text));
        } catch(e) {
            sanitizedBody = text.replace(/\n/g, '<br>');
        }

        stepEl.innerHTML = `
            <div class="step-header">
                <div class="step-icon-badge ${type}"><i class="fa-solid ${icon}"></i></div>
                <span class="step-title">${title}</span>
            </div>
            <div class="step-body">${sanitizedBody}</div>
        `;

        currentAgentState.stepsList.appendChild(stepEl);
        renderKaTeX(stepEl);
        scrollToBottom();
    }

    function addFinalAnswer(text) {
        if (!currentAgentState) {
            createAgentMessageContainer();
        }
        currentAgentState.accumulatedAnswer = text;
        try {
            currentAgentState.finalAnswerContainer.innerHTML = DOMPurify.sanitize(marked.parse(text));
        } catch (e) {
            currentAgentState.finalAnswerContainer.innerHTML = DOMPurify.sanitize(text.replace(/\n/g, '<br>'));
        }
        renderKaTeX(currentAgentState.finalAnswerContainer);
        scrollToBottom();
    }

    function finishAgentStream(success = true) {
        if (!currentAgentState) return;
        if (currentAgentState.timerInterval) {
            clearInterval(currentAgentState.timerInterval);
            currentAgentState.timerInterval = null;
        }
        const totalTime = ((Date.now() - currentAgentState.startTime) / 1000).toFixed(1);
        currentAgentState.statusBadge.classList.remove('running');
        currentAgentState.statusBadge.classList.add(success ? 'completed' : 'aborted');
        
        const pulse = currentAgentState.statusBadge.querySelector('.status-pulse-dot');
        if (pulse) pulse.remove();

        if (success) {
            currentAgentState.statusText.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success);"></i> Tamamlandı (${currentAgentState.stepCount} adım)`;
        } else {
            currentAgentState.statusText.innerHTML = `<i class="fa-solid fa-circle-stop" style="color: var(--danger);"></i> Durduruldu (${totalTime}s)`;
        }
        
        if (currentAgentState.statusTimer) {
            currentAgentState.statusTimer.textContent = `${totalTime}s`;
        }

        if (currentAgentState.actions) {
            currentAgentState.actions.style.display = 'flex';
        }
    }

    // --- CODE BLOCK UTILITIES (UNIFIED SANDBOX PREVIEW, FULLSCREEN, COPY) ---
    window.toggleCodePreview = function(btn) {
        const wrapper = btn.closest('.code-block-wrapper');
        if (!wrapper) return;
        const pre = wrapper.querySelector('pre');
        if (!pre) return;
        
        let previewPane = wrapper.querySelector('.code-preview-pane');
        if (!previewPane) {
            previewPane = document.createElement('div');
            previewPane.className = 'code-preview-pane';
            previewPane.style.display = 'none';
            wrapper.appendChild(previewPane);
        }
        
        let iframe = previewPane.querySelector('iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.className = 'code-preview-frame';
            previewPane.appendChild(iframe);
        }
        
        const isShowing = (previewPane.style.display === 'block');
        if (!isShowing) {
            // Find parent message container to gather sibling code blocks (Unified Sandbox)
            const parentMsg = wrapper.closest('.final-answer-container, .step-body, .message-content, .message-wrapper') || document.body;
            const siblingWrappers = parentMsg.querySelectorAll('.code-block-wrapper');
            
            let combinedHTML = '';
            let combinedCSS = '';
            let combinedJS = '';
            
            const extractCodeFromWrapper = (w) => {
                const p = w.querySelector('pre');
                if (!p) return '';
                const lines = Array.from(p.querySelectorAll('.line-content')).map(l => l.innerText).join('\n');
                return (lines && lines.trim()) ? lines : (p.querySelector('code') ? p.querySelector('code').innerText : p.innerText);
            };

            siblingWrappers.forEach(sib => {
                const sibLang = (sib.getAttribute('data-lang') || '').toLowerCase();
                const sibCode = extractCodeFromWrapper(sib);
                if (!sibCode.trim()) return;

                if (sibLang === 'html' || sibLang === 'htm' || sibLang === 'svg' || sibLang === 'xml') {
                    combinedHTML += '\n' + sibCode;
                } else if (sibLang === 'css') {
                    combinedCSS += '\n' + sibCode;
                } else if (sibLang === 'javascript' || sibLang === 'js') {
                    combinedJS += '\n' + sibCode;
                } else if (sibCode.includes('<!DOCTYPE') || sibCode.includes('<html') || sibCode.includes('<div') || sibCode.includes('<button') || sibCode.includes('<style') || sibCode.includes('<svg')) {
                    combinedHTML += '\n' + sibCode;
                }
            });

            // If current block wasn't assigned (e.g. standalone block)
            const currentCode = extractCodeFromWrapper(wrapper);
            const currentLang = (wrapper.getAttribute('data-lang') || 'html').toLowerCase();
            
            if (currentLang === 'css' && !combinedCSS) combinedCSS = currentCode;
            if ((currentLang === 'javascript' || currentLang === 'js') && !combinedJS) combinedJS = currentCode;
            if ((currentLang === 'html' || currentLang === 'htm') && !combinedHTML) combinedHTML = currentCode;
            
            if (!combinedHTML && !combinedCSS && !combinedJS) {
                combinedHTML = currentCode;
            }

            let htmlContent = '';
            if (combinedHTML || combinedCSS || combinedJS) {
                // If the HTML already contains <!DOCTYPE html> or <html>, embed CSS and JS into it
                if (combinedHTML.includes('<html') || combinedHTML.includes('<!DOCTYPE')) {
                    htmlContent = combinedHTML;
                    if (combinedCSS && !htmlContent.includes(combinedCSS)) {
                        htmlContent = htmlContent.replace('</head>', `<style>\n${combinedCSS}\n</style></head>`);
                        if (!htmlContent.includes(combinedCSS)) {
                            htmlContent = `<style>\n${combinedCSS}\n</style>` + htmlContent;
                        }
                    }
                    if (combinedJS && !htmlContent.includes(combinedJS)) {
                        htmlContent = htmlContent.replace('</body>', `<script>\ntry {\n${combinedJS}\n} catch(e) { console.error('JS Hatası:', e); }\n<\/script></body>`);
                        if (!htmlContent.includes(combinedJS)) {
                            htmlContent += `<script>\ntry {\n${combinedJS}\n} catch(e) { console.error('JS Hatası:', e); }\n<\/script>`;
                        }
                    }
                } else {
                    // Assemble full clean template
                    htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin: 0; padding: 24px; background: #ffffff; color: #1e293b; min-height: 100vh; }
        ${combinedCSS}
    </style>
</head>
<body>
    ${combinedHTML || '<div class="preview-root"></div>'}
    <script>
        try {
            ${combinedJS}
        } catch(err) {
            console.error('Çalışma Hatası:', err);
        }
    <\/script>
</body>
</html>`;
                }
            } else {
                htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:monospace;padding:16px;background:#1e1e2e;color:#cdd6f4;}</style></head><body><pre>${currentCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`;
            }

            try {
                iframe.srcdoc = htmlContent;
            } catch(err) {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    doc.open();
                    doc.write(htmlContent);
                    doc.close();
                } catch(e2) {}
            }
            
            pre.style.display = 'none';
            previewPane.style.display = 'block';
            btn.innerHTML = '<i class="fa-solid fa-code"></i> Kod';
            btn.classList.add('active');
            btn.title = 'Koda Dön';
        } else {
            // Switch back to code
            pre.style.display = 'block';
            previewPane.style.display = 'none';
            btn.innerHTML = '<i class="fa-solid fa-play"></i> Önizle';
            btn.classList.remove('active');
            btn.title = 'Canlı Önizleme';
        }
    };

    window.toggleCodeFullscreen = function(btn) {
        const wrapper = btn.closest('.code-block-wrapper');
        if (!wrapper) return;
        wrapper.classList.toggle('code-fullscreen-active');
        const icon = btn.querySelector('i');
        if (wrapper.classList.contains('code-fullscreen-active')) {
            if (icon) icon.className = 'fa-solid fa-compress';
            btn.title = 'Tam Ekrandan Çık';
        } else {
            if (icon) icon.className = 'fa-solid fa-expand';
            btn.title = 'Tam Ekran';
        }
    };

    window.copyCode = function(btn) {
        const wrapper = btn.closest('.code-block-wrapper');
        if (!wrapper) return;
        const codeLines = Array.from(wrapper.querySelectorAll('.line-content')).map(l => l.innerText).join('\n');
        const text = codeLines || (wrapper.querySelector('pre code') ? wrapper.querySelector('pre code').innerText : wrapper.querySelector('pre').innerText);
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check" style="color:#10b981;"></i> Kopyalandı';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('copied');
            }, 2000);
        });
    };

    // Global event delegation for code block buttons
    document.addEventListener('click', (e) => {
        const previewBtn = e.target.closest('.preview-btn');
        if (previewBtn) {
            e.preventDefault();
            e.stopPropagation();
            window.toggleCodePreview(previewBtn);
            return;
        }
        const fullscreenBtn = e.target.closest('.fullscreen-btn');
        if (fullscreenBtn) {
            e.preventDefault();
            e.stopPropagation();
            window.toggleCodeFullscreen(fullscreenBtn);
            return;
        }
        const copyBtn = e.target.closest('.copy-btn, .copy-code-btn');
        if (copyBtn) {
            e.preventDefault();
            e.stopPropagation();
            window.copyCode(copyBtn);
            return;
        }
    });

    // --- CHAT EXPORT FUNCTIONALITY ---
    window.exportChat = function(format) {
        const dropdown = document.getElementById('export-menu-dropdown');
        if (dropdown) dropdown.classList.remove('show');

        const messageWrappers = document.querySelectorAll('.message-wrapper');
        const messages = [];

        messageWrappers.forEach(msg => {
            const isUser = msg.querySelector('.avatar.user') !== null;
            const role = isUser ? 'Kullanıcı' : 'Navi';
            
            let text = '';
            if (isUser) {
                const p = msg.querySelector('.message-content p');
                text = p ? p.innerText : (msg.querySelector('.message-content') ? msg.querySelector('.message-content').innerText : '');
            } else {
                const finalAns = msg.querySelector('.final-answer-container');
                if (finalAns && finalAns.innerText.trim()) {
                    text = finalAns.innerText;
                } else {
                    const content = msg.querySelector('.message-content');
                    text = content ? content.innerText : '';
                }
            }
            if (text.trim()) {
                messages.push({ role, content: text.trim(), time: new Date().toLocaleTimeString() });
            }
        });

        if (messages.length === 0) {
            alert('Dışa aktarılacak sohbet mesajı bulunamadı.');
            return;
        }

        const dateStr = new Date().toISOString().slice(0, 10);

        if (format === 'md') {
            let md = `# Navi Sohbet Kaydı\n**Tarih:** ${new Date().toLocaleString()}\n\n---\n\n`;
            messages.forEach(m => {
                const header = m.role === 'Kullanıcı' ? '### 👤 Kullanıcı' : '### 🧭 Navi (Yapay Zeka Asistanı)';
                md += `${header}\n\n${m.content}\n\n---\n\n`;
            });
            downloadFile(`navi-sohbet-${dateStr}.md`, 'text/markdown;charset=utf-8', md);
        } else if (format === 'json') {
            const dataObj = {
                title: "Navi Sohbet Arşivi",
                exportDate: new Date().toISOString(),
                totalMessages: messages.length,
                messages: messages
            };
            downloadFile(`navi-sohbet-${dateStr}.json`, 'application/json;charset=utf-8', JSON.stringify(dataObj, null, 2));
        } else if (format === 'pdf') {
            window.print();
        }
    };

    function downloadFile(filename, type, data) {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    // Export dropdown toggle listener
    const exportBtn = document.getElementById('export-chat-btn');
    const exportDropdown = document.getElementById('export-menu-dropdown');
    if (exportBtn && exportDropdown) {
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportDropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => {
            exportDropdown.classList.remove('show');
        });
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function getDynamicGreetingText() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Günaydın! Ben Navi";
        if (hour >= 12 && hour < 18) return "İyi Günler! Ben Navi";
        if (hour >= 18 && hour < 23) return "İyi Akşamlar! Ben Navi";
        return "İyi Geceler! Ben Navi";
    }

    window.setPrompt = function(text) {
        if (!taskInput) return;
        taskInput.value = text;
        taskInput.focus();
    };

    // --- AGENT SPOTLIGHT & DYNAMIC PROMPTS HUB ---
    const AGENT_PROMPT_DATA = {
        all: [
            { icon: 'orion', iconClass: 'fa-solid fa-code', title: 'Canlı Web Bileşeni Kodla', desc: 'Canlı Sandbox önizlemeli modern bir HTML/CSS kartı tasarla', prompt: 'HTML, CSS ve JavaScript kullanarak canlı çalışan şık bir interaktif sayaç kartı kodla' },
            { icon: 'debate', iconClass: 'fa-solid fa-scale-balanced', title: 'Ajanlar Arası Münazara', desc: 'Sirius ve Orion\'un tez ve antitezle çarpıştığı VS arenası', prompt: 'Monolitik mimari mi Mikroservis mimarisi mi, Sirius ve Orion ile münazara yapın' },
            { icon: 'vega', iconClass: 'fa-solid fa-square-root-variable', title: 'KaTeX ile Matematik & Bilim', desc: 'Sembolik hesaplama ve yüksek çözünürlüklü formüller', prompt: 'Euler özdeşliğini ve karmaşık sayıların geometrisini KaTeX denklemleriyle açıkla' },
            { icon: 'sirius', iconClass: 'fa-solid fa-brain', title: 'Derin Araştırma & Strateji', desc: 'Web taraması, sentez ve uygulanabilir yol haritası', prompt: 'Otonom AI ajanlarının 2026 yılındaki sektör etkileri hakkında kapsamlı bir araştırma raporu hazırla' }
        ],
        sirius: [
            { icon: 'sirius', iconClass: 'fa-solid fa-magnifying-glass', title: '2026 AI Pazar Analizi', desc: 'Web\'den en güncel pazar trendlerini araştırıp raporla', prompt: '2026 yapay zeka pazarındaki en son trendleri web araştırması yaparak kapsamlı bir rapor halinde sun' },
            { icon: 'sirius', iconClass: 'fa-solid fa-newspaper', title: 'Haftalık Teknoloji Özeti', desc: 'Yapay zeka ve açık kaynak dünyasındaki son haberler', prompt: 'Bu hafta yapay zeka dünyasında öne çıkan en kritik 5 gelişmeyi özetle' },
            { icon: 'sirius', iconClass: 'fa-solid fa-chart-line', title: 'Rakip & Çözüm Karşılaştırması', desc: 'Popüler LLM sağlayıcılarının avantajlarını listele', prompt: 'Gemini 2.0, Claude 3.5 ve GPT-4o modellerinin güçlü ve zayıf yönlerini karşılaştırmalı analiz et' },
            { icon: 'sirius', iconClass: 'fa-solid fa-book-open', title: 'Akademik Literatür Taraması', desc: 'Attention Is All You Need makalesini analiz et', prompt: 'Transformer mimarisi ve Self-Attention mekanizmasının matematiksel temellerini akademik dille açıkla' }
        ],
        orion: [
            { icon: 'orion', iconClass: 'fa-solid fa-laptop-code', title: 'İnteraktif Web UI Kartı', desc: 'HTML/CSS/JS ile buton efektli modern widget', prompt: 'HTML, CSS ve JavaScript kullanarak canlı çalışan şık bir interaktif sayaç kartı kodla' },
            { icon: 'orion', iconClass: 'fa-brands fa-python', title: 'Python ile Veri Analizi', desc: 'Pandas ve NumPy kullanarak veri işleme fonksiyonu', prompt: 'Python kullanarak bir CSV veri setini okuyup aykırı değerleri filtreleyen ve özet istatistik çıkaran temiz bir script yaz' },
            { icon: 'orion', iconClass: 'fa-solid fa-database', title: 'REST API & SQL Şeması', desc: 'Kullanıcı ve sipariş tabloları için ilişkisel şema', prompt: 'Bir e-ticaret uygulaması için PostgreSQL veritabanı şeması ve Express.js REST API rotalarını tasarla' },
            { icon: 'orion', iconClass: 'fa-solid fa-bolt', title: 'Algoritma Optimizasyonu', desc: 'O(N^2) karmaşıklığını O(N log N)\'e düşür', prompt: 'İki dizideki ortak elemanları en verimli (Time Complexity) şekilde bulan JavaScript algoritmasını yaz' }
        ],
        debate: [
            { icon: 'debate', iconClass: 'fa-solid fa-scale-balanced', title: 'Monolitik vs Mikroservis', desc: 'Sirius ve Orion ile mimari seçim münazarası', prompt: 'Monolitik mimari mi Mikroservis mimarisi mi, Sirius ve Orion ile münazara yapın' },
            { icon: 'debate', iconClass: 'fa-solid fa-server', title: 'PostgreSQL vs MongoDB', desc: 'İlişkisel SQL ve NoSQL veritabanı çatışması', prompt: 'PostgreSQL mi MongoDB mi daha avantajlı, Sirius ve Orion ile münazara yapın' },
            { icon: 'debate', iconClass: 'fa-solid fa-mobile-screen', title: 'Flutter vs React Native', desc: 'Çapraz platform mobil geliştirme münazarası', prompt: 'Mobil uygulama geliştirmede Flutter mı React Native mi, Sirius ve Orion ile münazara yapın' },
            { icon: 'debate', iconClass: 'fa-solid fa-shield-halved', title: 'Açık Kaynak vs Kapalı AI', desc: 'Yapay zeka modellerinin geleceği ve güvenlik', prompt: 'Yapay zekanın geleceğinde Açık Kaynak modeller mi Kapalı API modelleri mi kazanacak, münazara başlat' }
        ],
        vega: [
            { icon: 'vega', iconClass: 'fa-solid fa-square-root-variable', title: 'Schrödinger Dalga Denklemi', desc: 'Kuantum olasılık yoğunluğunu KaTeX ile modelle', prompt: 'Kuantum fiziğindeki Schrödinger dalga denklemini KaTeX formülleriyle adım adım açıkla' },
            { icon: 'vega', iconClass: 'fa-solid fa-infinity', title: 'Euler Özdeşliği İspatı', desc: 'e^(i*pi) + 1 = 0 formülünün analizi', prompt: 'Euler özdeşliğini ve karmaşık sayıların geometrisini KaTeX denklemleriyle açıkla' },
            { icon: 'vega', iconClass: 'fa-solid fa-chart-pie', title: 'Bayes Teoremi ve Olasılık', desc: 'Koşullu olasılık formülünü ve kullanımını açıkla', prompt: 'Bayes Teoremi formülünü KaTeX ile yazarak makine öğrenmesindeki kullanımını bir örnekle anlat' },
            { icon: 'vega', iconClass: 'fa-solid fa-atom', title: 'Özel Görelilik & Lorentz', desc: 'Zaman genişlemesi ve kütle-enerji eşdeğerliği', prompt: 'Einstein\'ın Özel Görelilik teorisini ve Lorentz dönüşümlerini KaTeX formülleriyle açıkla' }
        ],
        polaris: [
            { icon: 'polaris', iconClass: 'fa-solid fa-network-wired', title: 'Yüksek Trafikli Mimari', desc: '10 Milyon kullanıcı için ölçeklenebilir sistem', prompt: 'Büyük ölçekli bir e-ticaret mikroservis mimarisi planı ve stratejisi oluştur' },
            { icon: 'polaris', iconClass: 'fa-solid fa-road', title: 'SaaS Ürün Yol Haritası', desc: 'MVP\'den kurumsal ölçeğe 12 aylık plan', prompt: 'B2B bir SaaS ürünü geliştirmek için 4 çeyreklik (Q1-Q4) teknik ve stratejik yol haritası çıkar' },
            { icon: 'polaris', iconClass: 'fa-solid fa-user-shield', title: 'Zero Trust Güvenlik', desc: 'Kurumsal veri güvenliği ve kimlik doğrulama', prompt: 'Bir bulut altyapısı için Sıfır Güven (Zero Trust) mimarisinin bileşenlerini ve stratejisini hazırla' },
            { icon: 'polaris', iconClass: 'fa-solid fa-arrows-spin', title: 'CI/CD & DevOps Pipeline', desc: 'Otomatik test, derleme ve sıfır kesinti yayını', prompt: 'Kubernetes ve GitHub Actions kullanarak sıfır kesintili (Zero-downtime) bir CI/CD pipeline tasarımı hazırla' }
        ]
    };

    window.filterAgentPrompts = function(agentKey, pillEl) {
        const strip = pillEl ? pillEl.closest('.welcome-agents-strip') : document.querySelector('.welcome-agents-strip');
        if (strip) {
            strip.querySelectorAll('.agent-pill').forEach(p => p.classList.remove('active'));
            if (pillEl) pillEl.classList.add('active');
        }

        const container = document.getElementById('bento-grid-cards');
        if (!container) return;

        const items = AGENT_PROMPT_DATA[agentKey] || AGENT_PROMPT_DATA.all;
        container.innerHTML = items.map(item => `
            <div class="bento-card" onclick="setPrompt('${item.prompt.replace(/'/g, "\\'")}')">
                <div class="bento-icon ${item.icon}"><i class="${item.iconClass}"></i></div>
                <div class="bento-content">
                    <h4>${item.title}</h4>
                    <p>${item.desc}</p>
                </div>
                <span class="bento-arrow"><i class="fa-solid fa-arrow-right"></i></span>
            </div>
        `).join('');
    };

    // Spotlight mouse move listener
    document.addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.bento-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    function getWelcomeScreenHTML() {
        return `<div class="welcome-screen" id="welcome-screen">
            <div class="welcome-hero-badge">
                <span class="badge-tag"><i class="fa-solid fa-wand-magic-sparkles"></i> Navi 3.6</span>
                <span class="badge-separator">•</span>
                <span class="badge-status"><span class="status-dot-active"></span> 8 Uzman Ajan & Münazara Aktif</span>
            </div>
            <div class="welcome-icon-box">
                <div class="welcome-icon-aura"></div>
                <i class="fa-solid fa-circle-nodes"></i>
            </div>
            <h1 class="welcome-title gradient-text" id="welcome-dynamic-greeting">${getDynamicGreetingText()}</h1>
            <p class="welcome-subtitle">Fikirlerinizi, kodlarınızı ve stratejilerinizi gerçeğe dönüştüren yeni nesil çoklu-ajan stüdyosu.<br>Bugün hangi projeyi hayata geçiriyoruz?</p>
            
            <!-- AGENTS SHOWCASE STRIP (DYNAMIC FILTER) -->
            <div class="welcome-agents-strip">
                <div class="agent-pill active" data-agent="all" onclick="filterAgentPrompts('all', this)">
                    <span class="pill-dot" style="background: #a855f7; box-shadow: 0 0 6px #a855f7;"></span>
                    <span class="pill-name">Tümü</span>
                    <small>Öne Çıkan</small>
                </div>
                <div class="agent-pill sirius" data-agent="sirius" onclick="filterAgentPrompts('sirius', this)">
                    <span class="pill-dot sirius"></span>
                    <span class="pill-name">Sirius</span>
                    <small>Araştırma</small>
                </div>
                <div class="agent-pill orion" data-agent="orion" onclick="filterAgentPrompts('orion', this)">
                    <span class="pill-dot orion"></span>
                    <span class="pill-name">Orion</span>
                    <small>Yazılım</small>
                </div>
                <div class="agent-pill debate" data-agent="debate" onclick="filterAgentPrompts('debate', this)">
                    <span class="pill-dot debate"></span>
                    <span class="pill-name">Münazara</span>
                    <small>Arena</small>
                </div>
                <div class="agent-pill vega" data-agent="vega" onclick="filterAgentPrompts('vega', this)">
                    <span class="pill-dot vega"></span>
                    <span class="pill-name">Vega</span>
                    <small>Matematik</small>
                </div>
                <div class="agent-pill polaris" data-agent="polaris" onclick="filterAgentPrompts('polaris', this)">
                    <span class="pill-dot polaris"></span>
                    <span class="pill-name">Polaris</span>
                    <small>Baş Mimar</small>
                </div>
            </div>

            <!-- BENTO GRID PROMPT CARDS (WITH SPOTLIGHT) -->
            <div class="bento-grid" id="bento-grid-cards">
                <div class="bento-card" onclick="setPrompt('HTML, CSS ve JavaScript kullanarak canlı çalışan şık bir interaktif sayaç kartı kodla')">
                    <div class="bento-icon orion"><i class="fa-solid fa-code"></i></div>
                    <div class="bento-content">
                        <h4>Canlı Web Bileşeni Kodla</h4>
                        <p>Canlı Sandbox önizlemeli modern bir HTML/CSS kartı tasarla</p>
                    </div>
                    <span class="bento-arrow"><i class="fa-solid fa-arrow-right"></i></span>
                </div>

                <div class="bento-card" onclick="setPrompt('Monolitik mimari mi Mikroservis mimarisi mi, Sirius ve Orion ile münazara yapın')">
                    <div class="bento-icon debate"><i class="fa-solid fa-scale-balanced"></i></div>
                    <div class="bento-content">
                        <h4>Ajanlar Arası Münazara</h4>
                        <p>Sirius ve Orion'un tez ve antitezle çarpıştığı VS arenası</p>
                    </div>
                    <span class="bento-arrow"><i class="fa-solid fa-arrow-right"></i></span>
                </div>

                <div class="bento-card" onclick="setPrompt('Euler özdeşliğini ve karmaşık sayıların geometrisini KaTeX denklemleriyle açıkla')">
                    <div class="bento-icon vega"><i class="fa-solid fa-square-root-variable"></i></div>
                    <div class="bento-content">
                        <h4>KaTeX ile Matematik & Bilim</h4>
                        <p>Sembolik hesaplama ve yüksek çözünürlüklü formüller</p>
                    </div>
                    <span class="bento-arrow"><i class="fa-solid fa-arrow-right"></i></span>
                </div>

                <div class="bento-card" onclick="setPrompt('Otonom AI ajanlarının 2026 yılındaki sektör etkileri hakkında kapsamlı bir araştırma raporu hazırla')">
                    <div class="bento-icon sirius"><i class="fa-solid fa-brain"></i></div>
                    <div class="bento-content">
                        <h4>Derin Araştırma & Strateji</h4>
                        <p>Web taraması, sentez ve uygulanabilir yol haritası</p>
                    </div>
                    <span class="bento-arrow"><i class="fa-solid fa-arrow-right"></i></span>
                </div>
            </div>
        </div>`;
    }

    const initialGreeting = document.getElementById('welcome-dynamic-greeting');
    if (initialGreeting) initialGreeting.textContent = getDynamicGreetingText();

    clearBtn.addEventListener('click', () => {
        conversationHistory = [];
        currentSessionId = null;
        currentAgentState = null;
        chatBox.innerHTML = getWelcomeScreenHTML();
    });

    runBtn.addEventListener('click', async () => {
        // Eger uretim devam ediyorsa ve kullanici durdur tusuna bastiysa:
        if (runBtn.classList.contains('stop-mode') && activeAbortController) {
            activeAbortController.abort();
            addStreamStep('error', '🛑 Yanıt üretimi kullanıcı tarafından durduruldu.');
            finishAgentStream(false);
            resetUI();
            return;
        }

        const question = taskInput.value.trim();
        if (question === "") return;
        const welcome = document.getElementById("welcome-screen");
        if(welcome) welcome.style.display = "none";

        activeAbortController = new AbortController();
        runBtn.disabled = false;
        runBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
        runBtn.classList.add('stop-mode');
        runBtn.title = 'Üretimi Durdur';
        taskInput.disabled = true;
        
        const userContent = createMessageWrapper('user');
        userContent.innerHTML = DOMPurify.sanitize(`<p>${question}</p>`);
        
        currentAgentState = null;
        createAgentMessageContainer();
        scrollToBottom();

        const modelChoice = document.getElementById('model-selector') ? document.getElementById('model-selector').value : "auto";

        try {
            const response = await fetch('/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: activeAbortController.signal,
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
                addStreamStep('error', errorMsg);
                finishAgentStream(false);
                resetUI();
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let finalAnswer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

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
                                    addStreamStep('thought', data.content);
                                    finalAnswer += data.content + "\n";
                                }
                            }
                            else if (data.type === 'debate_sirius') {
                                addDebateStep('sirius', data.content);
                                finalAnswer += `### 🧠 Sirius'un Tezi:\n${data.content}\n\n`;
                            }
                            else if (data.type === 'debate_orion') {
                                addDebateStep('orion', data.content);
                                finalAnswer += `### 💻 Orion'un Antitezi:\n${data.content}\n\n`;
                            }
                            else if (data.type === 'action' || data.type === 'observation' || data.type === 'error') {
                                addStreamStep(data.type, data.content);
                            }
                            else if (data.type === 'session_id') {
                                if (!currentSessionId && data.content) {
                                    currentSessionId = data.content;
                                    if (typeof loadChatHistory === 'function') loadChatHistory();
                                }
                            }

                        } catch (e) {}
                    }
                }
            }

            finishAgentStream(true);

            conversationHistory.push({ role: 'user', content: question });
            conversationHistory.push({ role: 'model', content: finalAnswer });
            
            if (isVoiceInteraction) {
                speakText(finalAnswer);
                isVoiceInteraction = false;
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted by user.');
            } else {
                addStreamStep('error', `Bağlantı Hatası: ${error.message}`);
                finishAgentStream(false);
            }
        } finally {
            resetUI();
        }
    });

    // --- QUICK MENTION & SLASH COMMAND AUTOCOMPLETE ---
    const mentionDropdown = document.getElementById('quick-mention-dropdown');
    const mentionList = document.getElementById('quick-mention-list');
    const mentionHeader = document.getElementById('quick-mention-header');
    let mentionSelectedIndex = 0;
    let currentMentionItems = [];

    const QUICK_AGENTS = [
        { prefix: '@', name: 'Sirius', tag: '@Sirius: ', icon: 'sirius', iconClass: 'fa-solid fa-magnifying-glass', desc: 'Web & Derin Araştırma Uzmanı' },
        { prefix: '@', name: 'Orion', tag: '@Orion: ', icon: 'orion', iconClass: 'fa-solid fa-code', desc: 'Yazılım, Kod Geliştirme & Canlı Sandbox' },
        { prefix: '@', name: 'Münazara', tag: '@Münazara: ', icon: 'debate', iconClass: 'fa-solid fa-scale-balanced', desc: 'Sirius vs Orion Fikir Çarpışması & Sentez' },
        { prefix: '@', name: 'Vega', tag: '@Vega: ', icon: 'vega', iconClass: 'fa-solid fa-square-root-variable', desc: 'Matematik, Fizik & KaTeX Formülleri' },
        { prefix: '@', name: 'Polaris', tag: '@Polaris: ', icon: 'polaris', iconClass: 'fa-solid fa-network-wired', desc: 'Baş Mimari, Strateji & Sistem Tasarımı' },
        { prefix: '@', name: 'Lyra', tag: '@Lyra: ', icon: 'sirius', iconClass: 'fa-solid fa-pen-nib', desc: 'Yaratıcı Metin & Rapor Yazarlığı' }
    ];

    const QUICK_SLASH = [
        { prefix: '/', name: '/kod', tag: 'HTML, CSS ve JavaScript kullanarak canlı çalışan şık bir interaktif sayaç kartı kodla', icon: 'orion', iconClass: 'fa-solid fa-laptop-code', desc: 'Canlı Sandbox önizlemeli bileşen kodla' },
        { prefix: '/', name: '/munazara', tag: 'Monolitik mimari mi Mikroservis mimarisi mi, Sirius ve Orion ile münazara yapın', icon: 'debate', iconClass: 'fa-solid fa-scale-balanced', desc: 'İki zıt fikri Sirius ve Orion ile çarpıştır' },
        { prefix: '/', name: '/matematik', tag: 'Kuantum fiziğindeki Schrödinger dalga denklemini KaTeX formülleriyle adım adım açıkla', icon: 'vega', iconClass: 'fa-solid fa-square-root-variable', desc: 'KaTeX formülleriyle adım adım analiz et' },
        { prefix: '/', name: '/ara', tag: '2026 yılındaki otonom yapay zeka ajan trendleri hakkında derin araştırma yap ve özetle', icon: 'sirius', iconClass: 'fa-solid fa-globe', desc: 'Web\'den güncel verileri araştır ve özetle' },
        { prefix: '/', name: '/temizle', action: 'clear', icon: 'polaris', iconClass: 'fa-solid fa-broom', desc: 'Sohbeti sıfırla ve yeni oturum başlat' }
    ];

    function checkQuickMentionTrigger() {
        if (!taskInput || !mentionDropdown || !mentionList) return;
        const val = taskInput.value;
        const lastWord = val.split(/\s+/).pop();

        if (lastWord.startsWith('@')) {
            const query = lastWord.slice(1).toLowerCase();
            currentMentionItems = QUICK_AGENTS.filter(a => a.name.toLowerCase().includes(query));
            mentionHeader.innerHTML = `<span><i class="fa-solid fa-at"></i> Ajan Seçin</span><small>↑↓ Gezin, Enter Seç</small>`;
            renderMentionList();
        } else if (lastWord.startsWith('/')) {
            const query = lastWord.slice(1).toLowerCase();
            currentMentionItems = QUICK_SLASH.filter(s => s.name.toLowerCase().includes(query));
            mentionHeader.innerHTML = `<span><i class="fa-solid fa-terminal"></i> Hızlı Komutlar</span><small>↑↓ Gezin, Enter Seç</small>`;
            renderMentionList();
        } else {
            closeMentionDropdown();
        }
    }

    function renderMentionList() {
        if (!currentMentionItems || currentMentionItems.length === 0) {
            closeMentionDropdown();
            return;
        }
        mentionSelectedIndex = 0;
        mentionList.innerHTML = currentMentionItems.map((item, idx) => `
            <div class="quick-mention-item ${idx === 0 ? 'selected' : ''}" data-idx="${idx}">
                <div class="quick-mention-item-icon ${item.icon}"><i class="${item.iconClass}"></i></div>
                <div class="quick-mention-item-info">
                    <div class="quick-mention-item-title">${item.name}</div>
                    <div class="quick-mention-item-desc">${item.desc}</div>
                </div>
            </div>
        `).join('');

        mentionList.querySelectorAll('.quick-mention-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.getAttribute('data-idx'), 10);
                selectMentionItem(idx);
            });
        });

        mentionDropdown.style.display = 'block';
    }

    function closeMentionDropdown() {
        if (mentionDropdown) mentionDropdown.style.display = 'none';
        currentMentionItems = [];
    }

    function selectMentionItem(index) {
        const item = currentMentionItems[index];
        if (!item) return;

        if (item.action === 'clear') {
            clearBtn.click();
            closeMentionDropdown();
            return;
        }

        const val = taskInput.value;
        const words = val.split(/\s+/);
        words.pop(); // Remove the triggered @ or / token
        const newPrefix = words.length > 0 ? words.join(' ') + ' ' : '';
        taskInput.value = newPrefix + item.tag;
        taskInput.focus();
        closeMentionDropdown();

        // Adjust height
        taskInput.style.height = 'auto';
        taskInput.style.height = Math.min(taskInput.scrollHeight, 160) + 'px';
    }

    // Auto-resize textarea & mention check on input
    taskInput.addEventListener('input', () => {
        taskInput.style.height = 'auto';
        taskInput.style.height = Math.min(taskInput.scrollHeight, 160) + 'px';
        checkQuickMentionTrigger();
    });

    // Keyboard navigation in mention dropdown & submit on Enter
    taskInput.addEventListener('keydown', (e) => {
        if (mentionDropdown && mentionDropdown.style.display === 'block') {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                mentionSelectedIndex = (mentionSelectedIndex + 1) % currentMentionItems.length;
                updateMentionSelected();
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                mentionSelectedIndex = (mentionSelectedIndex - 1 + currentMentionItems.length) % currentMentionItems.length;
                updateMentionSelected();
                return;
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectMentionItem(mentionSelectedIndex);
                return;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeMentionDropdown();
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            runBtn.click();
        }
    });

    function updateMentionSelected() {
        const items = mentionList.querySelectorAll('.quick-mention-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === mentionSelectedIndex);
            if (i === mentionSelectedIndex) item.scrollIntoView({ block: 'nearest' });
        });
    }

    document.addEventListener('click', (e) => {
        if (mentionDropdown && !mentionDropdown.contains(e.target) && e.target !== taskInput) {
            closeMentionDropdown();
        }
    });

    // --- DRAG & DROP IMAGE ATTACHMENT ---
    const dropZone = document.getElementById('input-container-zone');
    const dropOverlay = document.getElementById('drag-drop-overlay');

    if (dropZone && dropOverlay) {
        let dragCounter = 0;
        dropZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            dropOverlay.style.display = 'flex';
        });
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                dropOverlay.style.display = 'none';
            }
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            dropOverlay.style.display = 'none';
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        selectedImageBase64 = ev.target.result;
                        const preview = document.getElementById('image-preview');
                        const previewCont = document.getElementById('image-preview-container');
                        if (preview && previewCont) {
                            preview.src = selectedImageBase64;
                            previewCont.style.display = 'block';
                        }
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
    }

    function resetUI() {
        activeAbortController = null;
        runBtn.disabled = false;
        runBtn.classList.remove('stop-mode');
        runBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        runBtn.title = 'Gönder';
        taskInput.disabled = false;
        taskInput.value = ''; 
        taskInput.style.height = 'auto';
        taskInput.focus();
        closeMentionDropdown();
    }

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

    let allUserChats = [];

    async function loadChatHistory() {
        const res = await fetch("/api/chats");
        if(!res.ok) return;
        allUserChats = await res.json();
        renderChatHistoryList(allUserChats);
    }

    function renderChatHistoryList(chats) {
        const list = document.querySelector(".chat-history-list");
        if (!list) return;
        list.innerHTML = "";

        if (!chats || chats.length === 0) {
            list.innerHTML = `
                <li class="history-item" style="opacity: 0.5; cursor: default; justify-content: center; padding: 14px 10px; font-size: 12px; font-style: italic; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px dashed var(--border-color);">
                    <i class="fa-solid fa-folder-open" style="margin-right: 6px;"></i> Sohbet bulunamadı
                </li>
            `;
            return;
        }

        // Group chats into Bugün, Dün, Önceki
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups = {
            today: [],
            yesterday: [],
            older: []
        };

        chats.forEach(c => {
            const chatDate = c.created_at ? new Date(c.created_at) : new Date();
            chatDate.setHours(0, 0, 0, 0);

            if (chatDate.getTime() === today.getTime()) {
                groups.today.push(c);
            } else if (chatDate.getTime() === yesterday.getTime()) {
                groups.yesterday.push(c);
            } else {
                groups.older.push(c);
            }
        });

        const renderGroup = (label, groupChats) => {
            if (groupChats.length === 0) return;
            const groupHeader = document.createElement("div");
            groupHeader.className = "history-date-group";
            groupHeader.textContent = label;
            list.appendChild(groupHeader);

            groupChats.forEach(c => {
                const li = document.createElement("li");
                li.className = "history-item";
                if (currentSessionId === c.id) li.classList.add("active");
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
                        return;
                    }
                    loadChat(c.id);
                    // On mobile, close sidebar
                    if (window.innerWidth <= 768) {
                        const sb = document.getElementById("app-sidebar") || document.querySelector(".sidebar");
                        const bd = document.getElementById("mobile-backdrop");
                        if (sb) sb.classList.remove("mobile-open");
                        if (bd) bd.classList.remove("show");
                    }
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
        };

        renderGroup("📅 Bugün", groups.today);
        renderGroup("🕒 Dün", groups.yesterday);
        renderGroup("📆 Önceki Sohbetler", groups.older);
    }

    // History live search input listener
    const historySearchInput = document.getElementById("history-search-input");
    if (historySearchInput) {
        historySearchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderChatHistoryList(allUserChats);
            } else {
                const filtered = allUserChats.filter(c => c.title.toLowerCase().includes(query));
                renderChatHistoryList(filtered);
            }
        });
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
        renderChatHistoryList(allUserChats); // Update active state
    }

    // Hide file pill on new chat
    clearBtn.addEventListener('click', () => {
        if (filePillContainer) filePillContainer.style.display = 'none';
        if (allUserChats.length > 0) renderChatHistoryList(allUserChats);
    });

    // --- SIDEBAR COLLAPSE / EXPAND & MOBILE TOGGLE ---
    const appSidebar = document.getElementById("app-sidebar") || document.querySelector(".sidebar");
    const dragHandle = document.getElementById("drag-handle");
    const sidebarToggleBtn = document.getElementById("sidebar-toggle");
    const sidebarCollapseBtn = document.getElementById("sidebar-collapse-btn");
    const mobileBackdrop = document.getElementById("mobile-backdrop");

    function toggleSidebar() {
        if (!appSidebar) return;
        if (window.innerWidth <= 768) {
            // Mobile overlay mode
            const isOpen = appSidebar.classList.toggle("mobile-open");
            if (mobileBackdrop) mobileBackdrop.classList.toggle("show", isOpen);
        } else {
            // Desktop collapse mode
            const isCollapsed = appSidebar.classList.toggle("sidebar-collapsed");
            if (dragHandle) dragHandle.classList.toggle("sidebar-collapsed", isCollapsed);
            localStorage.setItem("navi_sidebar_collapsed", isCollapsed ? "1" : "0");
        }
    }

    if (sidebarToggleBtn) sidebarToggleBtn.addEventListener("click", toggleSidebar);
    if (sidebarCollapseBtn) sidebarCollapseBtn.addEventListener("click", toggleSidebar);
    if (mobileBackdrop) {
        mobileBackdrop.addEventListener("click", () => {
            if (appSidebar) appSidebar.classList.remove("mobile-open");
            mobileBackdrop.classList.remove("show");
        });
    }

    // Restore desktop sidebar collapsed preference
    if (window.innerWidth > 768 && localStorage.getItem("navi_sidebar_collapsed") === "1") {
        if (appSidebar) appSidebar.classList.add("sidebar-collapsed");
        if (dragHandle) dragHandle.classList.add("sidebar-collapsed");
    }

    // Resizer logic
    if (dragHandle && appSidebar) {
        let isResizing = false;
        dragHandle.addEventListener("mousedown", (e) => {
            if (appSidebar.classList.contains("sidebar-collapsed")) return;
            isResizing = true;
            document.body.style.cursor = "col-resize";
            e.preventDefault(); 
        });
        document.addEventListener("mousemove", (e) => {
            if (!isResizing) return;
            let newWidth = e.clientX;
            if (newWidth < 200) newWidth = 200;
            if (newWidth > 500) newWidth = 500;
            appSidebar.style.width = newWidth + "px";
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

// --- GLOBAL SIDEBAR TOGGLE & COLLAPSE ---
window.toggleSidebar = function() {
    const sb = document.getElementById("app-sidebar") || document.querySelector(".sidebar");
    const dragHandle = document.getElementById("drag-handle");
    const mobileBackdrop = document.getElementById("mobile-backdrop");

    if (!sb) return;

    if (window.innerWidth <= 768) {
        const isOpen = sb.classList.toggle("mobile-open");
        if (mobileBackdrop) mobileBackdrop.classList.toggle("show", isOpen);
    } else {
        const isCollapsed = sb.classList.toggle("sidebar-collapsed");
        if (dragHandle) dragHandle.classList.toggle("sidebar-collapsed", isCollapsed);
        localStorage.setItem("navi_sidebar_collapsed", isCollapsed ? "1" : "0");
    }
};

// Restore desktop sidebar collapsed preference on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    const sb = document.getElementById("app-sidebar") || document.querySelector(".sidebar");
    const dragHandle = document.getElementById("drag-handle");
    if (window.innerWidth > 768 && localStorage.getItem("navi_sidebar_collapsed") === "1") {
        if (sb) sb.classList.add("sidebar-collapsed");
        if (dragHandle) dragHandle.classList.add("sidebar-collapsed");
    }
});


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
