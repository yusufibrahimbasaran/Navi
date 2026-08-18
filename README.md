# Navi 3.0 - Otonom Yapay Zeka Ajan Mimarisi

Navi, sıradan bir sor-cevap chatbotu olmaktan çok öteye geçen, LangChain ve LangGraph teknolojileri kullanılarak inşa edilmiş **Agentic (Otonom Ajan)** mimarisine sahip gelişmiş bir web asistanıdır.

## 🔥 Yeni Sürüm (Navi 3.0) Öne Çıkan Özellikleri

Navi 3.0 ile "Otonom Yapay Zeka" vizyonumuzu tamamladık ve ajanların kendi aralarında tartıştığı, plan yaptığı, kod yazıp güvenliğini test ettiği mükemmel bir ekosistem kurduk!

*   **🎙️ Ajanlar Arası Münazara (Multi-Agent Debate):** Karmaşık veya felsefi konularda tek bir ajanın cevabıyla yetinmiyoruz. **Sirius** (Araştırmacı) konuyu savunur, **Orion** (Yazılımcı) itiraz edip zayıf yönlerini bulur ve **Polaris** (Baş Mimar) bu fikirleri sentezleyerek size en mükemmel kararı sunar.
*   **📁 İzole Çalışma Alanları (Workspace Sistemi):** Navi artık sizin için sadece kod yazmakla kalmıyor, o kodları çalıştırabileceği, test edebileceği ve rapor/dosya üretebileceği oturuma özel **izole klasörlerde (workspaces)** çalışıyor. Ajanlar bu klasörde dosya okur, yazar ve test eder.
*   **🛡️ Güvenlik Kalkanı (Aegis Agent):** Otonom ajanların makinenizde kod çalıştırması risklidir. Navi 3.0'ın yerleşik güvenlik ajanı Aegis, tehlikeli komutları ve sistem dosyalarına müdahaleyi anında bloke eder.
*   **🧠 Dinamik Vektör Hafızası (FAISS Memory Scoring):** Yalnızca eski mesajları değil, sizinle ilgili "kalıcı gerçekleri" FAISS vektör veritabanına kaydeder, alaka düzeyini (relevance) puanlar ve tam gerektiği anda hatırlar.
*   **⚙️ Otomatik Hata Ayıklama (Auto-Correction):** Yazılımcı ajanımız Orion, kod yazdıktan sonra hata alırsa size bunu yansıtmaz. Kendi hatasını okur, düzeltir ve kod başarıyla çalışana kadar otonom olarak (maks. 3 kez) kendini iyileştirir.
*   **⚡ Dinamik Model Fallback Ağı:** Groq (Llama 3), Gemini, OpenAI (GPT-4) veya Anthropic. Sistem bir modele ulaşamadığında veya model yayından kalktığında dinamik olarak çalışan API modellerini bulup çökmeden otonom geçiş yapar.

---

## 🌟 Yıldız Ajan Kadromuz

*   **Navi (Yönlendirici):** Tüm isteklerinizi analiz edip doğru departmana ileten yönetici ajan.
*   **Polaris (Baş Mimar):** Karmaşık görevleri alt görevlere (DAG) bölen ve büyük resmi gören lider.
*   **Sirius (Araştırmacı):** İnternette derinlemesine araştırmalar yapan ve kaynak toplayan ajan.
*   **Orion (Yazılım Uzmanı):** Python kodları yazan, çalıştıran ve hataları kendi kendine düzelten mühendis.
*   **Vega (Matematik Uzmanı):** Sayısal hesaplamaları sıfır hatayla yapan analitik ajan.
*   **Lyra (Metin Yazarı):** Blog, e-posta veya makale üreten yaratıcı zeka.
*   **Rigel (Veri Analisti):** Görsel veya veri dosyası yüklendiğinde bunları analiz eden uzman (Yakında tam sürüm!).

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
*   Python 3.9 veya üstü
*   Gerekli API Anahtarları (Gemini, Groq vb. - en az biri yeterlidir)

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
5.  Tarayıcınızda `http://127.0.0.1:5001` adresine giderek Navi 3.0'ın sınırlarını zorlayın!
