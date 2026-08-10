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

tools = [wikipedia, internet_search, calculate, get_weather]

system_prompt = (
    "Sen cok profesyonel, bilgili ve yardimsever bir yapay zeka asistanisin. Adin Navi. "
    "Kullaniciya verecegin TUM nihai cevaplari KESINLIKLE Markdown formatinda, sik ve duzenli bir sekilde sunmalisin. "
    "Sunlara dikkat et:\n"
    "- Onemli kelimeleri veya sonuclari **kalin (bold)** yaz.\n"
    "- Adim adim veya liste halinde bilgi verirken madde isaretleri (bullet points) kullan.\n"
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

@app.route("/run", methods=["POST"])
def run_task():
    data = request.json
    question = data.get("question", "")
    api_key = data.get("api_key", "")
    groq_key = data.get("groq_key", "")
    openai_key = data.get("openai_key", "")
    anthropic_key = data.get("anthropic_key", "")
    chat_session_id = data.get("session_id")
    
    user_id = session.get('user_id')

    llms = []
    if api_key:
        os.environ["GOOGLE_API_KEY"] = api_key
        llms.append(ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0))
    if groq_key:
        os.environ["GROQ_API_KEY"] = groq_key
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
        llms.append(ChatGroq(model=groq_model, temperature=0))
    if openai_key:
        os.environ["OPENAI_API_KEY"] = openai_key
        llms.append(ChatOpenAI(model="gpt-4o-mini", temperature=0))
    if anthropic_key:
        os.environ["ANTHROPIC_API_KEY"] = anthropic_key
        llms.append(ChatAnthropic(model="claude-3-5-sonnet-20240620", temperature=0))

    if not llms:
        return {"error": "Lutfen en az bir adet API Anahtari girin."}, 400

    # GECMISI YUKLE
    messages_payload = []
    if user_id and chat_session_id:
        chat = ChatSession.query.filter_by(id=chat_session_id, user_id=user_id).first()
        if chat:
            for m in chat.messages:
                role = "ai" if m.role == "agent" else m.role
                messages_payload.append((role, m.content))
    
    # Yeni soruyu ekle
    messages_payload.append(("user", question))

    try:
        primary_llm = llms[0]
        if len(llms) > 1:
            llm_with_fallbacks = primary_llm.with_fallbacks(llms[1:])
        else:
            llm_with_fallbacks = primary_llm
        
        agent_executor = create_react_agent(llm_with_fallbacks, tools, prompt=system_prompt)
    except Exception as e:
        return {"error": f"Ajan baslatilamadi: {str(e)}"}, 500

    def generate():
        final_answer_accumulated = ""
        current_session_id = chat_session_id
        
        try:
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

            for chunk in agent_executor.stream({"messages": messages_payload}, stream_mode="updates"):
                if "agent" in chunk:
                    ai_msg = chunk["agent"]["messages"][-1]
                    if ai_msg.tool_calls:
                        for tc in ai_msg.tool_calls:
                            action_str = f"Arac Kullaniliyor: {tc['name']}\nParametreler: {tc['args']}"
                            yield f"data: {json.dumps({'type': 'action', 'content': action_str})}\n\n"
                    elif ai_msg.content:
                        final_answer_accumulated += ai_msg.content
                        yield f"data: {json.dumps({'type': 'thought', 'content': f'Answer:\n{ai_msg.content}'})}\n\n"
                
                elif "tools" in chunk:
                    tool_msg = chunk["tools"]["messages"][-1]
                    obs_content = tool_msg.content
                    if len(obs_content) > 300:
                        obs_content = obs_content[:300] + "... (Kisaltildi)"
                    obs_str = f"Arac Sonucu: {obs_content}"
                    yield f"data: {json.dumps({'type': 'observation', 'content': obs_str})}\n\n"
                    
            # Islem bittiginde ajanin cevabini veritabanina kaydet
            if user_id and current_session_id and final_answer_accumulated:
                with app.app_context():
                    agent_msg = ChatMessage(session_id=current_session_id, role="agent", content=final_answer_accumulated)
                    db.session.add(agent_msg)
                    db.session.commit()
                    
            # Istemciye session_id'yi dondur (URL guncellemeleri icin)
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
                        # Modellerin kendi yanitini veritabanina ekle
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
