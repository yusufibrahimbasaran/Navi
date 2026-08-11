# Navi 1.0 - Gelişmiş Multi-Agent (Otonom) Yapay Zeka Asistanı 🚀

Navi, sıradan bir sor-cevap (ChatGPT benzeri) chatbot olmaktan öteye geçmek için tasarlanmış **Agentic (Otonom Ajan)** mimarisine sahip bir web asistanıdır. LangChain ve LangGraph teknolojileri kullanılarak inşa edilmiştir.

## ✨ Öne Çıkan Özellikler (Navi 1.0)

*   **Çoklu Ajan (Multi-Agent) Mimarisi & Denetmen (Reviewer):** Navi tek bir beyin değildir; bir **ekiptir**. Kullanıcının sorusuna göre yönlendirici (Router) ajan görevi Yazılımcı, Araştırmacı veya Matematikçi ajanlara dağıtır. Çıkan sonuç kullanıcıya iletilmeden önce katı bir **Denetmen Ajan (Reviewer)** tarafından incelenir. Hata varsa (örn: eksik kod, güvenlik açığı), Denetmen bu çıktıyı reddeder ve uzman ajana düzeltmesi için geri gönderir. Tüm bu tartışmayı arayüzde şeffafça izleyebilirsiniz.
*   **Dinamik Araç Kullanımı (Tool Calling):** Navi sadece metin üretmez, eylem alır. 
    *   İnternette güncel arama yapabilir ve web sayfalarının içeriğini okuyabilir.
    *   Python kodları yazıp arka planda terminalde çalıştırarak sonuçlarını getirebilir.
    *   Matematiksel işlemleri hatasız hesaplayabilir.
    *   Hava durumunu anlık çekebilir.
*   **Uzun Süreli Hafıza (Memory):** Sizin hakkınızdaki önemli bilgileri SQLite veritabanında saklar ve sonraki sohbetlerde sizi tanıyarak kişiselleştirilmiş cevaplar verir.
*   **Çoklu Model Desteği (Model Agnostic):** Google Gemini, Groq (Llama 3), OpenAI (GPT-4) ve Anthropic (Claude) API anahtarlarını destekler. Modeller arasında arayüzden tek tıkla geçiş yapabilirsiniz. Eğer bir model çökerse (Fallback), otomatik olarak diğerine geçer.
*   **Canlı Veri Akışı (SSE Streaming):** Ajanların düşünme süreçleri, araç (tool) kullanımları ve aralarındaki tartışmalar Server-Sent Events (SSE) ile arayüze saniye saniye canlı olarak yansıtılır.

## 🛠️ Kurulum ve Çalıştırma

### Gereksinimler
*   Python 3.9 veya üstü
*   Gerekli API Anahtarları (Gemini, Groq vb.)

### Adımlar
1.  Projeyi klonlayın ve dizine gidin:
    \\ash
    git clone https://github.com/yusufibrahimbasaran/VastAI.git
    cd VastAI
    \2.  Gerekli kütüphaneleri yükleyin:
    \\ash
    pip install -r requirements.txt
    \    *(Not: equirements.txt\ yoksa \pip install flask flask-sqlalchemy langchain langchain-community langchain-groq langchain-google-genai langgraph beautifulsoup4\ vb. bağımlılıkları manuel yükleyin).*
3.  Proje ana dizininde bir \.env\ dosyası oluşturun ve API anahtarlarınızı ekleyin:
    \\env
    GOOGLE_API_KEY=sizin_gemini_anahtariniz
    GROQ_API_KEY=sizin_groq_anahtariniz
    OPENAI_API_KEY=sizin_openai_anahtariniz
    ANTHROPIC_API_KEY=sizin_anthropic_anahtariniz
    \4.  Uygulamayı başlatın:
    \\ash
    python app.py
    \5.  Tarayıcınızda \http://127.0.0.1:5001\ adresine giderek Navi ile tanışın!

## 📂 Proje Yapısı

*   \pp.py\: Backend sunucusu, Flask yönlendirmeleri, LangGraph ajan mimarisi ve SSE veri akışı.
*   \	emplates/index.html\: Navi'nin modern, karanlık tema tabanlı ve cam efekti (glassmorphism) esintili arayüzü.
*   \static/app.js\: Frontend mantığı, canlı akış (stream) çözümleyicisi ve UI animasyonları.
*   \static/style.css\: Mor (Navi) renk paletine sahip CSS stilleri.
*   \instance/navi.db\: Kullanıcı geçmişini ve hafızasını tutan yerel SQLite veritabanı.

---
*Gelecek Sürüm (Navi 2.0) için Planlananlar: React Native Mobil Entegrasyonu, Sesli Etkileşim (Voice/TTS) ve Yerel Dosya (RAG) Analizi.*
