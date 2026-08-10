import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools import WikipediaQueryRun, DuckDuckGoSearchRun
from langchain_community.utilities import WikipediaAPIWrapper
# 1. API ANAHTARI
# Daha önce aldığınız Gemini API Anahtarınızı buraya yapıştırın.
# Başka hiçbir API almanıza gerek yok!
os.environ["GOOGLE_API_KEY"] = "BURAYA_YAPISTIRIN"

print("Ajan Başlatılıyor (LangChain)...")

# 2. BEYİN (LLM) TANIMLAMASI
# Kendi yazdığımız projedeki client tanımlamasının LangChain'deki karşılığı:
llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0)

# 3. ARAÇLARIN (TOOLS) TANIMLANMASI
# LangChain'in hazır araçlarını ve kendi yazacağımız araçları kullanıyoruz.
wikipedia = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper(lang="tr"))
_ddg = DuckDuckGoSearchRun()

from langchain_core.tools import tool
import math

# Arama Motoru (Hata Yakalayıcı Kalkan)
@tool
def internet_search(query: str) -> str:
    """Güncel haberler ve internet aramaları için kullan. (Örn: Galatasaray güncel teknik direktörü)"""
    try:
        return _ddg.run(query)
    except Exception as e:
        return f"Arama motoru şu an bot korumasına takıldı (Hata: {e}). Lütfen bunun yerine Wikipedia aracını kullan."

# LangChain'e kendi özel aracımızı (Tool) eklemek işte bu kadar kolay!
@tool
def calculate(expression: str) -> str:
    """Matematiksel işlemleri hesaplar. İçine '2 * 5' gibi matematiksel bir string girilir."""
    try:
        allowed_names = {k: v for k, v in math.__dict__.items() if not k.startswith("__")}
        result = eval(expression, {"__builtins__": None}, allowed_names)
        return str(result)
    except Exception as e:
        return f"Hata: {e}"

# Araçları ajanın anlayacağı bir listeye koyuyoruz
tools = [
    wikipedia,
    internet_search,
    calculate
]

from langgraph.prebuilt import create_react_agent

# 4. AJANI OLUŞTURMA (Modern LangGraph Mimarisi)
# Eski LangChain 'AgentExecutor' mimarisi yerine, 2025/2026 standardı olan 'LangGraph' kullanıyoruz.

# Ajanı yarat
agent_executor = create_react_agent(llm, tools)

# 5. TEST ETME (Etkileşimli Döngü)
print("\n" + "="*50)
print("LangChain (LangGraph) Ajanı Hazır!")
print("Çıkmak için 'q' veya 'quit' yazın.")
print("="*50 + "\n")

while True:
    soru = input("\nAjanınıza bir görev verin: ")
    if soru.lower() in ['q', 'quit', 'çıkış', 'exit']:
        print("Görüşmek üzere!")
        break
    
    if not soru.strip():
        continue

    print("\nAjan düşünüyor...\n")
    try:
        # Ajanı çalıştır
        sonuc = agent_executor.invoke({"messages": [("user", soru)]})
        
        print("\n" + "="*50)
        print("FİNAL CEVAP:")
        
        icerik = sonuc["messages"][-1].content
        if isinstance(icerik, list) and len(icerik) > 0 and 'text' in icerik[0]:
            print(icerik[0]['text'])
        else:
            print(icerik)
            
        print("="*50 + "\n")
    except Exception as e:
        print(f"\n[HATA]: {e}\n")
