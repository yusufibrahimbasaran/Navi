from langchain_core.runnables import RunnableConfig
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
from langchain_core.documents import Document
from langgraph.prebuilt import create_react_agent
from langchain_core.globals import set_llm_cache
from langchain_community.cache import SQLiteCache

# Akilli Hafiza (Cache)
set_llm_cache(SQLiteCache(database_path="langchain_cache.db"))

app = Flask(__name__)
import os
app.secret_key = os.getenv('FLASK_SECRET_KEY', os.urandom(24))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///navi.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

UPLOAD_FOLDER = os.path.join(app.root_path, "uploads")
FAISS_FOLDER = os.path.join(app.root_path, "faiss_db")
USER_MEMORY_FAISS_FOLDER = os.path.join(app.root_path, "user_memory_faiss")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(FAISS_FOLDER, exist_ok=True)
os.makedirs(USER_MEMORY_FAISS_FOLDER, exist_ok=True)

db = SQLAlchemy(app)

# ================= VERITABANI MODELLERI =================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fullname = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    job_title = db.Column(db.String(100), nullable=True)
    interests = db.Column(db.String(300), nullable=True)
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

# ================= ARAÇCLAR =================
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
def execute_python_code(code: str, config: RunnableConfig) -> str:
    """
    Python kodu calistirir ve konsol ciktisini (stdout) dondurur.
    Gorevleri coezmek veya veri analizi yapmak icin bu araci kullanin.
    Kritik kural: Kodun sonucunu gormek icin mutlaka print() kullanmalisiniz!
    Sistem dosyalarini silmeyin veya zarar vermeyin.
    """
    import sys
    import io
    import os
    import re
    
    
    # AEGIS: GUVENLIK KALKANI (REGEX)
    dangerous_patterns = [
        r"os\.system", r"os\.popen", r"subprocess", r"shutil\.rmtree", r"__import__", r"os\.remove", r"os\.unlink", r"os\.rmdir",
        r"rm\s+-rf", r"sys\.exit", r"eval\(", r"exec\("
    ]
    for pattern in dangerous_patterns:
        if re.search(pattern, code):
            return f"❌ AEGIS GUVENLIK IHLALI: '{pattern}' kullanimi tespit edildi ve engellendi. Bu komut guvenlik politikalari geregi yasaktir."

    # WORKSPACE IZOLASYONU
    session_id = config.get('configurable', {}).get('session_id', 'local_user')
    workspace_dir = os.path.join(os.getcwd(), 'workspaces', str(session_id))
    os.makedirs(workspace_dir, exist_ok=True)
    
    old_cwd = os.getcwd()
    old_stdout = sys.stdout
    redirected_output = sys.stdout = io.StringIO()
    
    try:
        os.chdir(workspace_dir)
        global_env = {}
        exec(code, global_env)
        output = redirected_output.getvalue()
        if not output:
            output = "Kod basariyla calisti ancak hicbir cikti uretmedi (print() kullanmayi unutmus olabilirsiniz)."
        return output
    except Exception as e:
        return f"Kod calisirken Hata Olustu:\n{e}"
    finally:
        os.chdir(old_cwd)
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
    "- Veri, tablo veya çıkarsilastirma varsa mutlaka Markdown tablosu olustur.\n"
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
    # RAG ve dosya yukleme ozelligi Navi 3.1 surumunde gecici olarak devre disi birakilmistir.
    return jsonify({"error": "Dosya yukleme su an Navi 3.1 surumunde devre disidir."}), 503


@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    fullname = data.get("fullname")
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    job_title = data.get("job_title", "")
    interests = data.get("interests", "")
    
    if User.query.filter_by(email=email).first() or User.query.filter_by(username=username).first():
        return jsonify({"error": "Bu e-posta adresi veya kullanici adi zaten kullaniliyor."}), 400
        
    hashed_pw = generate_password_hash(password)
    new_user = User(
        fullname=fullname, 
        username=username, 
        email=email, 
        password_hash=hashed_pw,
        job_title=job_title,
        interests=interests
    )
    db.session.add(new_user)
    db.session.commit()
    
    # Initialize FAISS memory if job_title or interests are provided
    if job_title or interests:
        try:
            from langchain_core.documents import Document
            from langchain_community.vectorstores import FAISS
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            import os
            facts = []
            if job_title:
                facts.append(f"Kullanicinin meslegi/unvani: {job_title}")
            if interests:
                facts.append(f"Kullanicinin ilgi alanlari: {interests}")
                
            docs = [Document(page_content=fact, metadata={"source": "user_memory"}) for fact in facts]
            
            user_index_path = os.path.join(USER_MEMORY_FAISS_FOLDER, str(new_user.id))
            if os.path.exists(user_index_path):
                user_vectorstore = FAISS.load_local(user_index_path, embeddings_model, allow_dangerous_deserialization=True)
                user_vectorstore.add_documents(docs)
            else:
                user_vectorstore = FAISS.from_documents(docs, embeddings_model)
            user_vectorstore.save_local(user_index_path)
            
            for fact in facts:
                new_memory = UserMemory(user_id=new_user.id, fact=fact)
                db.session.add(new_memory)
            db.session.commit()
        except Exception as e:
            print("Register FAISS Error:", e)
    
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
        return jsonify({"error": "Sohbet bulunamadi."}), 404
        
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
        return jsonify({"error": "Sohbet bulunamadi."}), 404
        
    data = request.json
    new_title = data.get("title", "").strip()
    if not new_title:
        return jsonify({"error": "Gecerli bir isim girmelisiniz."}), 400
        
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

    gemini_model = ChatGoogleGenerativeAI(model="gemini-3.6-flash", temperature=0, max_retries=5) if api_key else None
    openai_model = ChatOpenAI(model="gpt-4o-mini", temperature=0) if openai_key else None
    anthropic_model = ChatAnthropic(model="claude-3-5-sonnet-20240620", temperature=0) if anthropic_key else None
    
    groq_model_instance = None
    if groq_key:
        try:
            import requests
            resp = requests.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {groq_key}"}, timeout=5)
            if resp.status_code == 200:
                available_models = [m["id"] for m in resp.json().get("data", [])]
                tool_models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"]
                groq_model = next((m for m in tool_models if m in available_models), "openai/gpt-oss-120b")
            else:
                groq_model = "openai/gpt-oss-120b"
        except Exception:
            groq_model = "openai/gpt-oss-120b"
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
    for m in [gemini_model, openai_model, anthropic_model]:
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
                
            from langchain_core.documents import Document
            from langchain_community.vectorstores import FAISS
            user_index_path = os.path.join(USER_MEMORY_FAISS_FOLDER, str(user_id))
            doc = Document(page_content=fact, metadata={"source": "user_memory"})
            if os.path.exists(user_index_path):
                user_vectorstore = FAISS.load_local(user_index_path, embeddings_model, allow_dangerous_deserialization=True)
                user_vectorstore.add_documents([doc])
            else:
                user_vectorstore = FAISS.from_documents([doc], embeddings_model)
            user_vectorstore.save_local(user_index_path)
            
            return "Bilgi basariyla kalici akilli hafizaya (FAISS) kaydedildi."
        except Exception as e:
            return f"Hata: {e}"
            
    request_tools = tools.copy()
    request_tools.append(save_user_memory)

    dynamic_prompt = system_prompt
    if user_id:
        from langchain_community.vectorstores import FAISS
        user_index_path = os.path.join(USER_MEMORY_FAISS_FOLDER, str(user_id))
        
        # Sadece ilgili (skoru yuksek) ilk 3 bilgiyi getir (Memory Scoring)
        if os.path.exists(user_index_path):
            try:
                user_vectorstore = FAISS.load_local(user_index_path, embeddings_model, allow_dangerous_deserialization=True)
                results = user_vectorstore.similarity_search_with_score(question, k=3)
                if results:
                    facts_str = ""
                    for doc, score in results:
                        relevance = max(0, int(100 - (score * 40)))
                        facts_str += f"- {doc.page_content} (Alaka Puani: %{relevance})\n"
                    dynamic_prompt += f"\n\n[SISTEM BILGISI: AKILLI HAFIZA (MEMORY SCORING)]\nBu kullanici hakkinda su anki sordugu soruyla alakali en onemli bilgiler:\n{facts_str}\nCevap verirken bunlari dikkate al, ancak sadece gerektiginde bahset."
            except Exception as e:
                print("FAISS Memory Error:", e)

    try:
        primary_llm = llms[0]
        if len(llms) > 1:
            llm_with_fallbacks = primary_llm.with_fallbacks(llms[1:])
        else:
            llm_with_fallbacks = primary_llm
        
        sirius_tools = [t for t in request_tools if t.name in ["wikipedia", "internet_search", "get_weather", "read_webpage"]]
        vega_tools = [t for t in request_tools if t.name in ["calculate"]]
        nova_tools = [t for t in request_tools if t.name in ["save_user_memory"]]
        orion_tools = [t for t in request_tools if t.name in ["execute_python_code", "internet_search"]]
        lyra_tools = [t for t in request_tools if t.name in ["internet_search", "read_webpage"]]
        rigel_tools = [t for t in request_tools if t.name in ["internet_search", "execute_python_code"]]
        
        sirius_prompt = dynamic_prompt + "\n[GOREV: SIRIUS (Arastirmaci)]\nSen bilgiye ac bir arastirmacisin. Sadece arastirma ve okuma yaparsin."
        vega_prompt = dynamic_prompt + "\n[GOREV: VEGA (Matematik Uzmani)]\nSen mantik ve matematigin yildizisin. Sadece problemleri ve denklemleri coz."
        nova_prompt = dynamic_prompt + "\n[GOREV: NOVA (Genel Asistan)]\nSen arkadas canlisi bir sohbet asistanisin. Gerekirse hafiza kaydet."
        orion_prompt = dynamic_prompt + "\n[GOREV: ORION (Yazilim Uzmani)]\nSen kodlarin efendisisin. Istenen isleri yapmak icin Python kodu yaz ve 'execute_python_code' ile calistir. Sonuclari gormek icin print() kullan!"
        lyra_prompt = dynamic_prompt + "\n[GOREV: LYRA (Kreatif Metin Yazari)]\nSen kelimelerin efendisisin. Yaratici yazilar, makaleler, e-postalar yazarsin ve edebi bir dil kullanirsin."
        rigel_prompt = dynamic_prompt + "\n[GOREV: RIGEL (Gorsel ve Veri Analisti)]\nSen fotograflari ve verileri okuyan keskin gozlu bir uzmansin. Gorsellerdeki detaylari analiz et."
        
        polaris_tools = request_tools.copy()
        polaris_prompt = dynamic_prompt + """
[GOREV: POLARIS (Bas Mimar)]
Sen Polaris'in yurutme (Executor) lobusun. Sohbet gecmisinde zaten senin icin hazirlanmis bir [PLAN] var. 
Artik plan yapmana, strateji dusunmene veya uzun metinler yazmana gerek yok. 
SADECE plandaki adimlara harfiyen uyarak araclari (tools) sirayla calistir ve gorev tamamlandiginda nihai sonucu derle.
"""

        sirius_agent = create_react_agent(llm_with_fallbacks, sirius_tools, prompt=sirius_prompt)
        vega_agent = create_react_agent(llm_with_fallbacks, vega_tools, prompt=vega_prompt)
        nova_agent = create_react_agent(llm_with_fallbacks, nova_tools, prompt=nova_prompt)
        orion_agent = create_react_agent(llm_with_fallbacks, orion_tools, prompt=orion_prompt)
        lyra_agent = create_react_agent(llm_with_fallbacks, lyra_tools, prompt=lyra_prompt)
        rigel_agent = create_react_agent(llm_with_fallbacks, rigel_tools, prompt=rigel_prompt)
        polaris_agent = create_react_agent(llm_with_fallbacks, polaris_tools, prompt=polaris_prompt)

        router_prompt = (
            "Asagidaki kullanici mesajini oku ve hangi uzman ajanin cevaplamasi gerektigine karar ver.\n"
            "SADECE 'SIRIUS', 'VEGA', 'ORION', 'POLARIS', 'NOVA', 'LYRA', 'RIGEL' veya 'DEBATE' kelimelerinden birini dondur.\n"
            "Baska HICBIR sey yazma.\n\n"
            "- Eger mesaj karsilastirma, tartisma, munazara veya beyin firtinasi iceriyorsa: DEBATE\n            - Eger mesaj birden fazla adimdan olusan karmasik bir islem gerektiriyorsa: POLARIS\n"
            "- Eger mesaj resim iceriyorsa, gorsel inceleme veya resim analizi ise: RIGEL\n"
            "- Eger mesaj yazi yazma, blog, makale, metin uretimi veya e-posta taslagi ise: LYRA\n"
            "- Eger mesaj Python kodu yazmayi, script calistirmayi gerektiriyorsa: ORION\n"
            "- Eger mesaj matematiksel bir hesaplama, problem cozumu ise: VEGA\n"
            "- Eger mesaj guncel haber, hava durumu, internet arastirmasi ise: SIRIUS\n"
            "- Diger her turlu sohbet, hal hatir sorma icin: NOVA\n\n"
            f"Kullanici mesaji: {question}"
        )
        route_content = llm_with_fallbacks.invoke(router_prompt).content
        if isinstance(route_content, list):
            route_content = " ".join([c.get("text", "") for c in route_content if isinstance(c, dict) and "text" in c])
        route_response = route_content.strip().upper()
        
        if "POLARIS" in route_response:
            agent_executor = polaris_agent
            selected_agent_name = "Polaris (Baş Mimar)"
        elif "ORION" in route_response or "CODER" in route_response:
            agent_executor = orion_agent
            selected_agent_name = "Orion (Yazılım Uzmanı)"
        elif "VEGA" in route_response or "MATH" in route_response:
            agent_executor = vega_agent
            selected_agent_name = "Vega (Matematik Uzmanı)"
        elif "SIRIUS" in route_response or "RESEARCHER" in route_response:
            agent_executor = sirius_agent
            selected_agent_name = "Sirius (Araştırmacı)"
        elif "DEBATE" in route_response:
            agent_executor = None
            selected_agent_name = "Münazara (Debate)"
        elif "LYRA" in route_response or "WRITER" in route_response:
            agent_executor = lyra_agent
            selected_agent_name = "Lyra (Metin Yazarı)"
        elif "RIGEL" in route_response or "VISION" in route_response:
            agent_executor = rigel_agent
            selected_agent_name = "Rigel (Görsel Analist)"
        else:
            agent_executor = nova_agent
            selected_agent_name = "Nova (Genel Asistan)"
            
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
            
            if selected_agent_name == "Münazara (Debate)":
                yield f"data: {json.dumps({'type': 'action', 'content': '🎙️ Yönetici Navi: Konu beyin fırtınası gerektiriyor. Ajanlar Arası Münazara (Debate) başlatılıyor...'})}\n\n"
                
                yield f"data: {json.dumps({'type': 'action', 'content': '🧠 Sirius (Araştırmacı): Konuyu analiz edip ilk argümanı sunuyor...'})}\n\n"
                sirius_prompt = f"Sen Sirius'sun. Şu konuyu detaylıca analiz et ve güçlü bir argüman/taraf sun: {question}"
                sirius_arg = llm_with_fallbacks.invoke(sirius_prompt).content
                if isinstance(sirius_arg, list): sirius_arg = " ".join([c.get("text", "") for c in sirius_arg if isinstance(c, dict)])
                yield f"data: {json.dumps({'type': 'thought', 'content': f'**Sirius:**\n{sirius_arg}'})}\n\n"
                
                yield f"data: {json.dumps({'type': 'action', 'content': '💻 Orion (Yazılımcı): Sirius\'un argümanını eleştiriyor ve karşıt bir perspektif sunuyor...'})}\n\n"
                orion_prompt = f"Sen Orion'sun (Yazılımcı/Sistem Uzmanı). Sirius şu argümanı sundu:\n{sirius_arg}\nBu argümandaki zayıf noktaları bul, eleştir ve daha iyi/farklı bir teknik yaklaşım sun."
                orion_arg = llm_with_fallbacks.invoke(orion_prompt).content
                if isinstance(orion_arg, list): orion_arg = " ".join([c.get("text", "") for c in orion_arg if isinstance(c, dict)])
                yield f"data: {json.dumps({'type': 'thought', 'content': f'**Orion:**\n{orion_arg}'})}\n\n"
                
                yield f"data: {json.dumps({'type': 'action', 'content': '🌟 Polaris (Baş Mimar): Argümanları sentezleyip nihai kararı veriyor...'})}\n\n"
                polaris_prompt = f"Sen Polaris'sin (Baş Mimar). Konu: {question}\nSirius'un Savunması: {sirius_arg}\nOrion'un İtirazı: {orion_arg}\nBu iki görüşü sentezle, tartışmayı özetle ve kullanıcıya en mantıklı nihai kararı sun."
                final_verdict = llm_with_fallbacks.invoke(polaris_prompt).content
                if isinstance(final_verdict, list): final_verdict = " ".join([c.get("text", "") for c in final_verdict if isinstance(c, dict)])
                yield f"data: {json.dumps({'type': 'thought', 'content': f'**Polaris:**\n{final_verdict}'})}\n\n"
                
                final_answer_accumulated = f"### 🧠 Sirius'un Analizi:\n{sirius_arg}\n\n### 💻 Orion'un Eleştirisi:\n{orion_arg}\n\n### 🌟 Polaris'in Sentezi (Nihai Karar):\n{final_verdict}"
                
            elif selected_agent_name == "Polaris (Baş Mimar)":
                yield f"data: {json.dumps({'type': 'action', 'content': '🌟 Polaris: Görev analiz ediliyor ve stratejik planı oluşturuluyor...'})}\n\n"
                planner_prompt = f"Sen Polaris'in planlama lobusun. Aşağıdaki görevi cozmek için adım adım numaralıı bir planı çıçıkar. KESİNLİKLE ARAÇÇ (TOOL) KULLANMA. Sadece metin olarak plani yaz.\n\nGörev: {question}"
                plan_content = llm_with_fallbacks.invoke(planner_prompt).content
                if isinstance(plan_content, list):
                    plan_content = " ".join([c.get("text", "") for c in plan_content if isinstance(c, dict) and "text" in c])
                
                yield f"data: {json.dumps({'type': 'thought', 'content': f'Answer:\n[PLAN]\n{plan_content}'})}\n\n"
                
                from langchain_core.messages import AIMessage
                current_messages.append(AIMessage(content=f"İşte oluşturduğum stratejik planı:\n{plan_content}\n\nŞimdi bu plana sadık kalarak araçları sırayla kullanacağım."))

            revision_count = 0
            max_revisions = 1  # 1 ekstra revizyon
            
            while revision_count <= max_revisions and selected_agent_name != "Münazara (Debate)":
                worker_output = ""
                
                # UZMAN AJAN (Worker) DEVREDE
                for chunk in agent_executor.stream({"messages": current_messages}, config={"configurable": {"session_id": chat_session_id}}, stream_mode="updates"):
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
                
                # NOVA / Genel sohbet ajanı ise veya çıktı yoksa doğrudan bitir
                if "NOVA" in route_response or "GENERAL" in route_response or not worker_output:
                    final_answer_accumulated = worker_output
                    break
                    
                # DENETMEN (Reviewer) DEVREDE
                yield f"data: {json.dumps({'type': 'action', 'content': f'🔍 Denetmen Ajan devrede: Çıktı kalite ve doğruluk açısından inceleniyor...'})}\n\n"
                
                reviewer_prompt = f"""Sen titiz ve katı bir Denetmen Ajansın (Reviewer).
Aşağıdaki kullanıcı görevini ve uzman ajanın verdiği yanıtı incele.
Görev: {question}
Uzman Cevabı: {worker_output}

Eğer cevap tamamen doğru, güvenli, eksiksizse ve kullanıcının isteğini tam olarak çıkarşılıyorsa SADECE "[KABUL]" yaz.
Eğer eksik, kodda bariz bir hata, güvenlik açığı veya yetersiz açıklama varsa "[RED]" yaz ve hemen yanına nedenini ve eksikleri listele. (Örn: [RED] Kodda x değişkeni tanımsız, ayrıca yorum satırı eksik.)"""
                
                reviewer_response = llm_with_fallbacks.invoke(reviewer_prompt).content
                
                if isinstance(reviewer_response, list):
                    reviewer_response = " ".join([c.get("text", "") for c in reviewer_response if isinstance(c, dict) and "text" in c])
                
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
                        yield f"data: {json.dumps({'type': 'thought', 'content': failed_gen})}\n\n"
                        if user_id and current_session_id:
                             with app.app_context():
                                agent_msg = ChatMessage(session_id=current_session_id, role="agent", content=failed_gen)
                                db.session.add(agent_msg)
                                db.session.commit()
                        return
                except Exception:
                    pass
            yield f"data: {json.dumps({'type': 'error', 'content': f'Sistem Hatasi: {str(e)}'})}\n\n"

    from flask import stream_with_context
    return Response(stream_with_context(generate()), mimetype="text/event-stream")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False, use_reloader=False)
