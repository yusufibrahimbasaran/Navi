import os
import json
import math
from datetime import datetime
from flask import Flask, render_template, request, Response, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_community.tools import WikipediaQueryRun, DuckDuckGoSearchRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langchain_core.globals import set_llm_cache
from langchain_community.cache import SQLiteCache

# Akilli Hafiza (Cache)
set_llm_cache(SQLiteCache(database_path="langchain_cache.db"))

app = Flask(__name__)
app.secret_key = "super_secret_navi_key_2026"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///navi.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ================= VERITABANI MODELLERI =================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fullname = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    sessions = db.relationship('ChatSession', backref='user', lazy=True)

class ChatSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    messages = db.relationship('ChatMessage', backref='session', lazy=True, cascade="all, delete-orphan")


class UserMemory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    fact = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('chat_session.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False) # 'user' or 'agent'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()

# ================= ARACLAR =================
wikipedia = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper(lang="tr"))
_ddg = DuckDuckGoSearchRun()

@tool
def internet_search(query: str) -> str:
    """Guncel haberler ve internet aramalari icin kullan."""
    try:
        return _ddg.run(query)
    except Exception as e:
        return f"Arama motoru bot korumasina takildi. Hata: {e}"

@tool
def calculate(expression: str) -> str:
    """Matematiksel islemleri hesaplar."""
    try:
        allowed_names = {k: v for k, v in math.__dict__.items() if not k.startswith("__")}
        result = eval(expression, {"__builtins__": None}, allowed_names)
        return str(result)
    except Exception as e:
        return f"Hata: {e}"

@tool
def get_weather(city: str) -> str:
    """Belirtilen sehrin guncel hava durumunu getirir."""
    try:
        import requests
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=tr&format=json"
        geo_data = requests.get(geo_url, timeout=5).json()
        if not geo_data.get("results"):
            return f"{city} icin koordinat bulunamadi."
        
        lat = geo_data["results"][0]["latitude"]
        lon = geo_data["results"][0]["longitude"]
        
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        w_data = requests.get(weather_url, timeout=5).json()
        current = w_data.get("current_weather", {})
        
        if not current:
            return "Hava durumu verisi alinamadi."
            
        temp = current.get("temperature", "Bilinmiyor")
        wind = current.get("windspeed", "Bilinmiyor")
        return f"{city} Guncel Hava Durumu: Sicaklik: {temp}°C, Ruzgar Hizi: {wind} km/s."
    except Exception as e:
        return f"Hava durumu servisine erisilemedi: {e}"

@tool
def read_webpage(url: str) -> str:
    """Bir web sitesinin (URL) icerigini okur. Arama motorundan buldugun linklerin icindeki metni ve detaylari okumak icin bu araci kullan."""
    try:
        import requests
        from bs4 import BeautifulSoup
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.content, 'html.parser')
        
        # Gereksiz sayfa iskeleti bolumlerini temizle
        for script in soup(["script", "style", "nav", "footer", "header", "aside"]):
            script.extract()
            
        text = soup.get_text(separator=' ', strip=True)
        
        if len(text) > 15000:
            return text[:15000] + "\n... (Metin cok uzun oldugu icin kesildi)"
        return text
    except Exception as e:
        return f"Sayfa okunamadi: {e}"


@tool
def execute_python_code(code: str) -> str:
    """
    Python kodu calistirir ve konsol ciktisini (stdout) dondurur.
    Gorevleri cozmek veya veri analizi yapmak icin bu araci kullanin.
    Kritik kural: Kodun sonucunu gormek icin mutlaka print() kullanmalisiniz!
    Sistem dosyalarini silmeyin veya zarar vermeyin.
    """
    import sys
    import io
    
    old_stdout = sys.stdout
    redirected_output = sys.stdout = io.StringIO()
    
    try:
        # Create an isolated global dictionary
        global_env = {}
        exec(code, global_env)
        output = redirected_output.getvalue()
        if not output:
            output = "Kod basariyla calisti ancak hicbir cikti uretmedi (print() kullanmayi unutmus olabilirsiniz)."
        return output
    except Exception as e:
        return f"Kod calisirken Hata Olustu:\n{e}"
    finally:
        sys.stdout = old_stdout

tools = [execute_python_code, wikipedia, internet_search, calculate, get_weather, read_webpage]

system_prompt = (
    "Sen cok profesyonel, bilgili ve yardimsever bir yapay zeka asistanisin. Adin Navi. "
    "Kullanici senden derinlemesine arastirma istediginde, once internet_search araciyla arama yap, "
    "ardindan buldugun sonuclardaki URL'leri read_webpage araciyla okuyarak gercek ve guncel detaylari ogren.\n"
    "Kullaniciya verecegin TUM nihai cevaplari KESINLIKLE Markdown formatinda, sik ve duzenli bir sekilde sunmalisin. "
    "Sunlara dikkat et:\n"
    "- Onemli kelimeleri veya sonuclari **kalin (bold)** yaz.\n"
    "- Adim adim veya liste halinde bilgi verirken madde isaretleri (bullet points) kullan.\n"
    "- Kaynak belirtecegin zaman okudugun web sitelerinin URL'lerini link olarak ver.\n"
    "- Veri, tablo veya karsilastirma varsa mutlaka Markdown tablosu olustur.\n"
    "- Uzun cevaplari mantiksal bolumlere ayirmak icin Markdown basliklari (#, ##) kullan.\n"
    "- Cevabin her zaman profesyonel bir rapor gibi estetik olmalidir."
)

# ================= UC NOKTALAR (ENDPOINTS) =================
@app.route("/")
def index():
    response = app.make_response(render_template("index.html"))
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# --- AUTH ENDPOINTS ---

@app.route("/api/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "Dosya bulunamad?"}), 400
    
    file = request.files['file']
    session_id = request.form.get('session_id')
    user_id = session.get("user_id")
    
    if not file or file.filename == '':
        return jsonify({"error": "Dosya se?ilmedi"}), 400

    if not session_id:
        session_id = str(uuid.uuid4())
        # If logged in, create a chat session
        if user_id:
            title = file.filename[:30]
            new_chat = ChatSession(id=session_id, user_id=user_id, title=title)
            db.session.add(new_chat)
            db.session.commit()

    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, f"{session_id}_{filename}")
    file.save(filepath)
    
    text = ""
    try:
        if filename.lower().endswith(".pdf"):
            doc = fitz.open(filepath)
            for page in doc:
                text += page.get_text()
            doc.close()
        else:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
    except Exception as e:
        return jsonify({"error": f"Dosya okuma hatas?: {str(e)}"}), 500

    if not text.strip():
        return jsonify({"error": "Belge bo? veya metin ??kar?lamad?."}), 400
        
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs = text_splitter.create_documents([text])
    
    index_path = os.path.join(FAISS_FOLDER, session_id)
    
    if os.path.exists(index_path):
        vectorstore = FAISS.load_local(index_path, embeddings_model, allow_dangerous_deserialization=True)
        vectorstore.add_documents(docs)
        vectorstore.save_local(index_path)
    else:
        vectorstore = FAISS.from_documents(docs, embeddings_model)
        vectorstore.save_local(index_path)
        
    return jsonify({
        "success": True, 
        "message": "Belge haf?zaya al?nd?.",
        "session_id": session_id,
        "filename": filename
    })


@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    fullname = data.get("fullname")
    email = data.get("email")
    password = data.get("password")
    
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Bu e-posta adresi zaten kullaniliyor."}), 400
        
    hashed_pw = generate_password_hash(password)
    new_user = User(fullname=fullname, email=email, password_hash=hashed_pw)
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"success": True, "message": "Kayit basarili! Lutfen giris yapin."})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    
    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password_hash, password):
        session['user_id'] = user.id
        return jsonify({"success": True, "fullname": user.fullname})
        
    return jsonify({"error": "E-posta veya sifre hatali."}), 401

@app.route("/api/logout", methods=["POST"])
def logout():
    session.pop('user_id', None)
    return jsonify({"success": True})

@app.route("/api/me", methods=["GET"])
def me():
    if 'user_id' in session:
        user = db.session.get(User, session['user_id'])
        if user:
            return jsonify({"logged_in": True, "fullname": user.fullname})
    return jsonify({"logged_in": False})

# --- CHAT HISTORY ENDPOINTS ---
@app.route("/api/chats", methods=["GET"])
def get_chats():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    chats = ChatSession.query.filter_by(user_id=session['user_id']).order_by(ChatSession.created_at.desc()).all()
    result = [{"id": c.id, "title": c.title, "created_at": c.created_at.isoformat()} for c in chats]
    return jsonify(result)

@app.route("/api/chats/<int:chat_id>", methods=["GET"])
def get_chat_messages(chat_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    chat = ChatSession.query.filter_by(id=chat_id, user_id=session['user_id']).first()
    if not chat:
        return jsonify({"error": "Chat not found"}), 404
        
    msgs = [{"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat()} for m in chat.messages]
    return jsonify(msgs)

# --- RUN ENDPOINT ---

@app.route("/api/chats/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Giri? yapman?z gerekiyor."}), 401
        
    chat = ChatSession.query.filter_by(id=chat_id, user_id=user_id).first()
    if not chat:
        return jsonify({"error": "Sohbet bulunamad?."}), 404
        
    # Delete associated messages
    ChatMessage.query.filter_by(session_id=chat_id).delete()
    
    # Delete the chat session itself
    db.session.delete(chat)
    db.session.commit()
    
    return jsonify({"success": True})


@app.route("/api/chats/<chat_id>", methods=["PUT"])
def rename_chat(chat_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Giri? yapman?z gerekiyor."}), 401
        
    chat = ChatSession.query.filter_by(id=chat_id, user_id=user_id).first()
    if not chat:
        return jsonify({"error": "Sohbet bulunamad?."}), 404
        
    data = request.json
    new_title = data.get("title", "").strip()
    if not new_title:
        return jsonify({"error": "Ge?erli bir isim girmelisiniz."}), 400
        
    chat.title = new_title
    db.session.commit()
    
    return jsonify({"success": True})


@app.route("/api/memory", methods=["GET"])
def get_memory():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    memories = UserMemory.query.filter_by(user_id=user_id).order_by(UserMemory.timestamp.desc()).all()
    return jsonify([{"id": m.id, "fact": m.fact, "timestamp": m.timestamp.isoformat()} for m in memories])

@app.route("/api/memory/<int:mem_id>", methods=["DELETE"])
def delete_memory(mem_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    mem = UserMemory.query.filter_by(id=mem_id, user_id=user_id).first()
    if mem:
        db.session.delete(mem)
        db.session.commit()
    return jsonify({"success": True})

@app.route("/api/memory/all", methods=["DELETE"])
def delete_all_memory():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    UserMemory.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"success": True})

@app.route("/run", methods=["POST"])
def run_task():
    data = request.json
    question = data.get("question", "")
    image = data.get("image", None)
    chat_session_id = data.get("session_id")
    
    user_id = session.get('user_id')

    # API Keys are now loaded from .env
    api_key = os.getenv("GOOGLE_API_KEY", "")
    groq_key = os.getenv("GROQ_API_KEY", "")
    openai_key = os.getenv("OPENAI_API_KEY", "")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    model_choice = data.get("model_choice", "auto")

    gemini_model = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0) if api_key else None
    openai_model = ChatOpenAI(model="gpt-4o-mini", temperature=0) if openai_key else None
    anthropic_model = ChatAnthropic(model="claude-3-5-sonnet-20240620", temperature=0) if anthropic_key else None
    
    groq_model_instance = None
    if groq_key:
        try:
            import requests
            resp = requests.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {groq_key}"}, timeout=5)
            if resp.status_code == 200:
                available_models = [m["id"] for m in resp.json().get("data", [])]
                tool_models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"]
                groq_model = next((m for m in tool_models if m in available_models), "mixtral-8x7b-32768")
            else:
                groq_model = "llama-3.3-70b-versatile"
        except Exception:
            groq_model = "llama-3.3-70b-versatile"
        groq_model_instance = ChatGroq(model=groq_model, temperature=0)

    # If user selected a specific model, check if key exists
    if model_choice != "auto":
        if model_choice == "gemini" and not gemini_model:
            return {"error": "Google Gemini API anahtari .env dosyasinda bulunamadi!"}, 400
        elif model_choice == "openai" and not openai_model:
            return {"error": "OpenAI API anahtari .env dosyasinda bulunamadi!"}, 400
        elif model_choice == "anthropic" and not anthropic_model:
            return {"error": "Anthropic API anahtari .env dosyasinda bulunamadi!"}, 400
        elif model_choice == "groq" and not groq_model_instance:
            return {"error": "Groq API anahtari .env dosyasinda bulunamadi!"}, 400

    llms = []
    # Add chosen model to the top
    if model_choice == "gemini" and gemini_model: llms.append(gemini_model)
    elif model_choice == "openai" and openai_model: llms.append(openai_model)
    elif model_choice == "anthropic" and anthropic_model: llms.append(anthropic_model)
    elif model_choice == "groq" and groq_model_instance: llms.append(groq_model_instance)

    # Add the rest as fallbacks
    for m in [gemini_model, groq_model_instance, openai_model, anthropic_model]:
        if m and m not in llms:
            llms.append(m)

    if not llms:
        return {"error": "Lutfen en az bir adet API Anahtari girin."}, 400

    if image:
        llms = [llm for llm in llms if not isinstance(llm, ChatGroq)]
        if not llms:
            return {"error": "Groq (Llama) modelleri su anda resim analizini desteklemiyor. Lutfen Ayarlar kismindan Groq anahtarini gecici olarak silip Gemini, OpenAI veya Anthropic kullanin."}, 400

    # GECMISI YUKLE
    messages_payload = []
    if user_id and chat_session_id:
        chat = ChatSession.query.filter_by(id=chat_session_id, user_id=user_id).first()
        if chat:
            for m in chat.messages:
                role = "ai" if m.role == "agent" else m.role
                messages_payload.append((role, m.content))
    
    # Yeni soruyu ekle (Eger resim varsa Multi-modal format kullan)
    if image:
        user_content = [
            {"type": "text", "text": question},
            {"type": "image_url", "image_url": {"url": image}}
        ]
        messages_payload.append(("user", user_content))
    else:
        messages_payload.append(("user", question))

    @tool
    def save_user_memory(fact: str) -> str:
        """Kullanici hakkinda ogrendigin kalici ve onemli bilgileri (meslek, isim, tercihler vb.) uzun sureli hafizaya kaydet."""
        if not user_id:
            return "Kullanici giris yapmadigi icin hafiza kaydedilemiyor."
        try:
            with app.app_context():
                new_mem = UserMemory(user_id=user_id, fact=fact)
                db.session.add(new_mem)
                db.session.commit()
            return "Bilgi basariyla hafizaya kaydedildi."
        except Exception as e:
            return f"Hata: {e}"
            
    request_tools = tools.copy()
    request_tools.append(save_user_memory)

    dynamic_prompt = system_prompt
    if user_id:
        memories = UserMemory.query.filter_by(user_id=user_id).all()
        if memories:
            facts = "\n".join([f"- {m.fact}" for m in memories])
            dynamic_prompt += f"\n\n[SISTEM BILGISI: UZUN SURELI HAFIZA]\nBu kullanici hakkinda sunlari biliyorsun:\n{facts}\nCevap verirken bunlari dikkate al, ancak sadece gerektiginde bahset."

    try:
        primary_llm = llms[0]
        if len(llms) > 1:
            llm_with_fallbacks = primary_llm.with_fallbacks(llms[1:])
        else:
            llm_with_fallbacks = primary_llm
        
        research_tools = [t for t in request_tools if t.name in ["wikipedia", "internet_search", "get_weather", "read_webpage"]]
        math_tools = [t for t in request_tools if t.name in ["calculate"]]
        general_tools = [t for t in request_tools if t.name in ["save_user_memory"]]
        coder_tools = [t for t in request_tools if t.name in ["execute_python_code", "internet_search"]]
        
        research_prompt = dynamic_prompt + "\n[GOREV: ARASTIRMACI]\nSadece arastirma ve okuma yap."
        math_prompt = dynamic_prompt + "\n[GOREV: MATEMATIKCI]\nSadece matematik problemleri coz."
        general_prompt = dynamic_prompt + "\n[GOREV: GENEL ASISTAN]\nSohbet et ve gerekirse hafiza kaydet."
        coder_prompt = dynamic_prompt + "\n[GOREV: YAZILIMCI]\nSen bir Python uzmanisin. Istenen isleri yapmak veya veri analizi/hesaplama gerceklestirmek icin Python kodu yaz ve 'execute_python_code' araciyla calistirarak sonucunu ogren. Cikti almak icin print() kullanmayi unutma."

        research_agent = create_react_agent(llm_with_fallbacks, research_tools, prompt=research_prompt)
        math_agent = create_react_agent(llm_with_fallbacks, math_tools, prompt=math_prompt)
        general_agent = create_react_agent(llm_with_fallbacks, general_tools, prompt=general_prompt)
        coder_agent = create_react_agent(llm_with_fallbacks, coder_tools, prompt=coder_prompt)

        router_prompt = (
            "Asagidaki kullanici mesajini oku ve hangi uzman ajanin cevaplamasi gerektigine karar ver.\n"
            "SADECE 'RESEARCHER', 'MATH', 'CODER' veya 'GENERAL' kelimelerinden birini dondur.\n"
            "Baska HICBIR sey yazma.\n\n"
            "- Eger mesaj Python kodu yazmayi, grafik cizmeyi veya cok karmasik algoritmik bir problemi (kod ile) cozeyi gerektiriyorsa: CODER\n"
            "- Eger mesaj matematiksel bir hesaplama, denlem veya problem cozumu gerektiriyorsa: MATH\n"
            "- Eger mesaj guncel haber, hava durumu, wikipedia bilgisi veya internette arastirilmasi gereken bir konuysa: RESEARCHER\n"
            "- Diger her turlu sohbet, hal hatir sorma, kisiligi hakkinda bilgi verme, genel soru icin: GENERAL\n\n"
            f"Kullanici mesaji: {question}"
        )
        route_content = primary_llm.invoke(router_prompt).content
        if isinstance(route_content, list):
            route_content = " ".join([c.get("text", "") for c in route_content if isinstance(c, dict) and "text" in c])
        route_response = route_content.strip().upper()
        
        if "CODER" in route_response:
            agent_executor = coder_agent
            selected_agent_name = "Yazılım Uzmanı"
        elif "MATH" in route_response:
            agent_executor = math_agent
            selected_agent_name = "Matematik Uzmanı"
        elif "RESEARCHER" in route_response:
            agent_executor = research_agent
            selected_agent_name = "Araştırmacı Ajan"
        else:
            agent_executor = general_agent
            selected_agent_name = "Genel Asistan"
            
    except Exception as e:
        return {"error": f"Ajan baslatilamadi: {str(e)}"}, 500

    def generate():
        final_answer_accumulated = ""
        current_session_id = chat_session_id
        
        try:
            yield f"data: {json.dumps({'type': 'action', 'content': f'Yönetici Navi: Görev **{selected_agent_name}** departmanına atandı.'})}\n\n"
            
            # Kullanici girisi varsa ve session yoksa yeni session olustur
            if user_id:
                with app.app_context():
                    if not current_session_id:
                        title = question[:25] + "..." if len(question) > 25 else question
                        new_session = ChatSession(user_id=user_id, title=title)
                        db.session.add(new_session)
                        db.session.commit()
                        current_session_id = new_session.id
                        
                    # Kullanicinin sorusunu veritabanina kaydet
                    user_msg = ChatMessage(session_id=current_session_id, role="user", content=question)
                    db.session.add(user_msg)
                    db.session.commit()

            current_messages = list(messages_payload)
            revision_count = 0
            max_revisions = 1  # 1 ekstra revizyon
            
            while revision_count <= max_revisions:
                worker_output = ""
                
                # UZMAN AJAN (Worker) DEVREDE
                for chunk in agent_executor.stream({"messages": current_messages}, stream_mode="updates"):
                    if "agent" in chunk:
                        ai_msg = chunk["agent"]["messages"][-1]
                        if ai_msg.tool_calls:
                            for tc in ai_msg.tool_calls:
                                action_str = f"Araç Kullanılıyor: {tc['name']}\nParametreler: {tc['args']}"
                                yield f"data: {json.dumps({'type': 'action', 'content': action_str})}\n\n"
                        elif ai_msg.content:
                            text_content = ai_msg.content
                            if isinstance(text_content, list):
                                text_content = " ".join([c.get("text", "") for c in text_content if isinstance(c, dict)])
                            worker_output += text_content
                            yield f"data: {json.dumps({'type': 'thought', 'content': f'Answer:\n{text_content}'})}\n\n"
                    
                    elif "tools" in chunk:
                        tool_msg = chunk["tools"]["messages"][-1]
                        obs_content = tool_msg.content
                        if len(obs_content) > 300:
                            obs_content = obs_content[:300] + "... (Kısaltıldı)"
                        obs_str = f"Araç Sonucu: {obs_content}"
                        yield f"data: {json.dumps({'type': 'observation', 'content': obs_str})}\n\n"
                
                # GENERAL ajan ise veya çıktı yoksa doğrudan bitir
                if "GENERAL" in route_response or not worker_output:
                    final_answer_accumulated = worker_output
                    break
                    
                # DENETMEN (Reviewer) DEVREDE
                yield f"data: {json.dumps({'type': 'action', 'content': f'🔍 Denetmen Ajan devrede: Çıktı kalite ve doğruluk açısından inceleniyor...'})}\n\n"
                
                reviewer_prompt = f"""Sen titiz ve katı bir Denetmen Ajansın (Reviewer).
Aşağıdaki kullanıcı görevini ve uzman ajanın verdiği yanıtı incele.
Görev: {question}
Uzman Cevabı: {worker_output}

Eğer cevap tamamen doğru, güvenli, eksiksizse ve kullanıcının isteğini tam olarak karşılıyorsa SADECE "[KABUL]" yaz.
Eğer eksik, kodda bariz bir hata, güvenlik açığı veya yetersiz açıklama varsa "[RED]" yaz ve hemen yanına nedenini ve eksikleri listele. (Örn: [RED] Kodda x değişkeni tanımsız, ayrıca yorum satırı eksik.)"""
                
                reviewer_response = primary_llm.invoke(reviewer_prompt).content
                
                if "[KABUL]" in reviewer_response.upper() or revision_count >= max_revisions:
                    if revision_count >= max_revisions and "[KABUL]" not in reviewer_response.upper():
                        yield f"data: {json.dumps({'type': 'action', 'content': '✅ Denetmen Ajan: Maksimum revizyon sınırına ulaşıldı, mevcut sonuç kabul ediliyor.'})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'action', 'content': '✅ Denetmen Ajan: Çıktı kusursuz bulundu ve onaylandı.'})}\n\n"
                    
                    final_answer_accumulated = worker_output
                    break
                else:
                    feedback = reviewer_response.replace("[RED]", "").replace("[red]", "").strip()
                    yield f"data: {json.dumps({'type': 'action', 'content': f'❌ Denetmen Ajan Reddetti: {feedback}\nUzmandan düzeltme isteniyor...'})}\n\n"
                    
                    from langchain_core.messages import HumanMessage, AIMessage
                    current_messages.append(AIMessage(content=worker_output))
                    current_messages.append(HumanMessage(content=f"Denetmen ajan cevabını reddetti ve şu düzeltmeleri istedi:\n{feedback}\nLütfen bu eleştirileri dikkate alarak cevabını/kodunu düzelt ve eksiksiz bir şekilde tekrar sun."))
                    revision_count += 1

            # Islem bittiginde ajanin cevabini veritabanina kaydet
            if user_id and current_session_id and final_answer_accumulated:
                with app.app_context():
                    agent_msg = ChatMessage(session_id=current_session_id, role="agent", content=final_answer_accumulated)
                    db.session.add(agent_msg)
                    db.session.commit()
                    
            if current_session_id:
                yield f"data: {json.dumps({'type': 'session_id', 'content': current_session_id})}\n\n"
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            error_str = str(e)
            if "failed_generation" in error_str:
                try:
                    import ast
                    dict_str = error_str[error_str.find("{"):]
                    err_dict = ast.literal_eval(dict_str)
                    failed_gen = err_dict.get('error', {}).get('failed_generation')
                    if failed_gen:
                        yield f"data: {json.dumps({'type': 'content', 'content': failed_gen})}\n\n"
                        if user_id and current_session_id:
                             with app.app_context():
                                agent_msg = ChatMessage(session_id=current_session_id, role="agent", content=failed_gen)
                                db.session.add(agent_msg)
                                db.session.commit()
                        return
                except Exception:
                    pass
            yield f"data: {json.dumps({'type': 'error', 'content': f'Sistem Hatasi: {str(e)}'})}\n\n"

    return Response(generate(), mimetype="text/event-stream")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True, use_reloader=False)
