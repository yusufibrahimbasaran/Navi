# Navi 2.0 - Otonom Yapay Zeka Asistanı 🚀

Navi, sıradan bir sor-cevap (ChatGPT benzeri) chatbot olmaktan öteye geçmek için tasarlanmış **Agentic (Otonom Ajan)** mimarisine sahip birinci sınıf bir web asistanıdır. LangChain ve LangGraph teknolojileri kullanılarak inşa edilmiştir.

## 🌟 Yeni Sürüm (Navi 2.0) Öne Çıkan Özellikleri

Navi 2.0, sistemi yepyeni bir zeka ve arayüz boyutuyla tanıştırıyor!

*   **🧠 Derin Hafıza (Vector DB - FAISS):** Navi artık sizinle yaptığı sohbetleri sadece hatırlamakla kalmıyor, onları derinlemesine analiz edip FAISS (vektör veritabanı) ile anlamlandırıyor. Mesleğinizi, ilgi alanlarınızı ve geçmişte verdiğiniz kritik detayları öğrenerek size **tamamen kişiselleştirilmiş** cevaplar sunuyor. 
*   **💻 Yerel Dosya Okuma ve Kodlama Yeteneği (Auto-Debug):** Navi artık yerel dosyalarınızı (RAG) okuyabilir, analiz edebilir ve gerektiğinde Python kodları yazıp sisteminizde çalıştırarak **otomatik hata ayıklama (auto-debug)** yapabilir.
*   **🎯 Planlama Zekası:** Büyük ve karmaşık projeleri adım adım bölen, stratejik planlar yapan ve "Denetmen Ajan" ile kodları/yazıları mükemmelleştiren eşsiz bir planlama zekası.
*   **🎨 Kusursuz Siber-Modern Arayüz (UI Yenilikleri):** 
    *   *Glassmorphism* (yarı saydam cam) stiliyle tasarlanmış, akıcı animasyonlara sahip muazzam giriş ve kayıt ekranları.
    *   Tamamen yeniden tasarlanmış sol menü (Sidebar) ve geçmiş sohbetler alanı.
    *   Sistem güvenliğini ve hafızanızı tek noktadan yönetmenizi sağlayan şık, sekmeli **Ayarlar** penceresi.
    *   Giriş yapılmadığında hassas özellikleri (Hafıza silme vb.) anında gizleyen senkron güvenlik altyapısı.
*   **🇹🇷 Tam UTF-8 ve Türkçe Karakter Desteği:** Sistem genelinde kodlama yapısı yenilenerek tüm Türkçe karakter ve metin sorunları tamamen çözüldü.

---

## ⚙️ Core Özellikler (Navi 1.0'dan Miras)

*   **Çoklu Ajan (Multi-Agent) Mimarisi:** Navi tek bir beyin değildir; bir **ekiptir**. Yönlendirici (Router) ajan görevi Yazılımcı, Araştırmacı veya Matematikçi ajanlara dağıtır.
*   **Denetmen (Reviewer):** Çıkan sonuç kullanıcıya iletilmeden önce katı bir Denetmen Ajan tarafından incelenir. Hata varsa (örn: eksik kod, güvenlik açığı), reddeder ve uzman ajana düzeltmesi için geri gönderir. 
*   **Dinamik Araç Kullanımı (Tool Calling):** 
    *   İnternette güncel arama yapabilir ve web sayfalarının içeriğini okuyabilir.
    *   Matematiksel işlemleri hatasız hesaplayabilir.
    *   Hava durumunu anlık çekebilir.
*   **Çoklu Model Desteği (Model Agnostic):** Google Gemini, Groq (Llama 3), OpenAI (GPT-4) ve Anthropic (Claude) API anahtarlarını destekler. Çökme (Fallback) durumunda otomatik geçiş yapar.
*   **Canlı Veri Akışı (SSE Streaming):** Ajanların düşünme süreçleri, araç (tool) kullanımları ve aralarındaki tartışmalar saniye saniye canlı olarak yansıtılır.

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
*   Python 3.9 veya üstü
*   Gerekli API Anahtarları (Gemini, Groq vb.)

### Adımlar
1.  Projeyi klonlayın ve dizine gidin:
    ```bash
    git clone https://github.com/yusufibrahimbasaran/VastAI.git
    cd VastAI
    ```
2.  Gerekli kütüphaneleri yükleyin:
    ```bash
    pip install -r requirements.txt
    ```
    *(Not: `requirements.txt` yoksa `pip install flask flask-sqlalchemy langchain langchain-community langchain-groq langchain-google-genai langgraph beautifulsoup4 faiss-cpu` vb. bağımlılıkları manuel yükleyin).*
3.  Proje ana dizininde bir `.env` dosyası oluşturun ve API anahtarlarınızı ekleyin:
    ```env
    GOOGLE_API_KEY=sizin_gemini_anahtariniz
    GROQ_API_KEY=sizin_groq_anahtariniz
    OPENAI_API_KEY=sizin_openai_anahtariniz
    ANTHROPIC_API_KEY=sizin_anthropic_anahtariniz
    ```
4.  Uygulamayı başlatın:
    ```bash
    python app.py
    ```
5.  Tarayıcınızda `http://127.0.0.1:5001` adresine giderek Navi 2.0 ile tanışın!

---
*Gelecek Sürüm (Navi 3.0) için Planlananlar: React Native Mobil Entegrasyonu ve Sesli Etkileşim (Voice/TTS / Speech-to-Text).*
