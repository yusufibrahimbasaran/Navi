# 🧭 Navi 3.6: Yeni Nesil Otonom Çoklu-Ajan Stüdyosu & Canlı İnteraktif Sandbox

<div align="center">

![Navi Banner](https://img.shields.io/badge/Navi-v3.6.0_Release-951DD1?style=for-the-badge&logo=openai&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-Multi--Agent-00A67E?style=for-the-badge&logo=chainlink&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-Server-000000?style=for-the-badge&logo=flask&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**Yapay Zeka Destekli Çoklu-Ajan Zekası, Canlı Kod Sandbox, Münazara Arenası ve Siber Arayüz Ekosistemi**

[Özellikler](#-temel-özellikler) • [Ajan Kadrosu](#-yıldız-ajan-kadrosu) • [Mimari](#-sistem-ve-ajan-mimarisi) • [Arayüz & UX](#-tasarım-ve-arayüz-deneyimi) • [Kurulum](#-kurulum-ve-başlangıç) • [API Referansı](#-api-ve-uç-noktalar)

</div>

---

## 📖 1. Proje Hakkında (Executive Summary)

**Navi 3.6**, tek bir yapay zeka modelinin sınırlarını aşarak; araştırmacı, yazılımcı, matematikçi, sistem mimarı ve editör gibi farklı uzmanlık alanlarına sahip **8 otonom ajanın** iş birliği yaptığı yeni nesil bir **Çoklu-Ajan (Multi-Agentic) Zeka Platformudur**.

LangChain ve LangGraph orkestrasyonu üzerinde inşa edilen Navi; kullanıcı sorgularını anında analiz eder, doğru uzman ajanlara yönlendirir, karşıt görüşleri **Münazara Odası**'nda sentezler ve üretilen kod bloklarını **Canlı Sandbox (Unified Live Preview)** üzerinde anında çalıştırır.

---

## 🌟 2. Temel Özellikler & Yenilikler

### 🧬 Çoklu-Ajan Orkestrasyonu & Münazara Arenası
* **Dinamik Yönlendirme (Router Engine):** Kullanıcının isteğini semantik olarak analiz edip en uygun uzmana (kod, matematik, web araştırması, yaratıcı metin) yönlendirir.
* **VS Münazara Odası (Debate Arena):** Karmaşık mimari veya teknoloji seçimlerinde (Örn: *PostgreSQL vs MongoDB*, *Monolit vs Mikroservis*) **Sirius (Tez)** ve **Orion (Antitez)** iki sütunlu arenada çarpışır; **Polaris** nihai sentez raporunu sunar.
* **Denetmen Ajan (Reviewer):** Tüm uzman çıktılarını güvenlik, doğruluk ve tutarlılık filtresinden geçirerek kullanıcıya hatasız yanıt ulaştırır.

### 💻 Canlı Sandbox & Gelişmiş Kod Deneyimi
* **Akıllı Çoklu Blok Birleştirici (Unified Sandbox):** HTML, CSS ve JavaScript bloklarını tek bir izole `<iframe>` havuzunda birleştirerek canlı çalışan web bileşenlerini sohbet içinde anında önizler.
* **Fira Code Tipografisi & Satır Numaraları:** Sözdizimi vurgulama, satır numaraları, tek tıkla kopyalama ve tam ekran kod görüntüleme modu.

### 📐 KaTeX ile Matematik & Bilimsel Hesaplama
* Karmaşık diferansiyel denklemler, kuantum formülleri, matrisler ve Bayes teoremleri yüksek çözünürlüklü vektörel **KaTeX / LaTeX** formatında kusursuzca render edilir.

### 📤 Çoklu Format Sohbet Dışa Aktarma (Export Hub)
* Sohbet oturumlarınızı tek tıkla **Markdown (.md)**, **JSON** veya profesyonel yazdırma formatlı **PDF** olarak dışa aktarın.

### 🎙️ Sesli İletişim & Türkçe TTS
* **Speech-to-Text (STT):** Web Speech API ile eller serbest Türkçe sesli komut girişi.
* **Text-to-Speech (TTS):** Üretilen yanıtları insan doğallığında Türkçe seslendirme ve anlık susturma/oynatma kontrolü.

---

## 🌌 3. Tasarım ve Arayüz Deneyimi (v3.6 Yenilikleri)

Navi 3.6, modern siber tasarım trendlerini (Linear, Vercel, Supabase estetiği) benimseyen eksiksiz bir görsel deneyim sunar:

| Alan | Yenilik & Özellik |
| :--- | :--- |
| **Arka Plan Atmosferi** | Vercel/Linear tarzı **Noktalı Siber Izgara (Dot-Matrix)** ve sayfanın derinliğinde süzülen hipnotik **Siber Ambiyans Işığı (Ambient Glow)**. |
| **Bento Grid & Hero** | Dönen neon aura ikonu, zamana göre dinamik karşılama başlığı ve fareyi gerçek zamanlı takip eden **Spotlight Işık Efekti**. |
| **Ajan Odak Modu** | Üstteki ajan rozetlerine tıklandığında aşağıdaki 4 Bento kartının seçilen uzmana göre anında evrilmesi. |
| **Giriş & Search Bar** | `@` ile ajan seçimi, `/` ile hızlı komutlar (`/kod`, `/munazara`, `/matematik`, `/ara`, `/temizle`), **Auto-Resize** textarea ve **Sürükle-Bırak Görsel Yükleme**. |
| **Sol Kenar Çubuğu** | **`◀` / `☰` Tekil Akıllı Katlama**, sohbet geçmişinde **Canlı Arama Çubuğu** ve **Tarih Gruplandırması** (*Bugün, Dün, Önceki*). |
| **Ekran Uyumu** | Dikey kaydırmaya gerek kalmadan tüm karşılama ekranının standart laptop ekranlarına **%100 tam oturması**. |

---

## 🤖 4. Yıldız Ajan Kadrosu

```
                                  ┌────────────────────────┐
                                  │      KULLANICI         │
                                  └───────────┬────────────┘
                                              │
                                  ┌───────────▼────────────┐
                                  │      Navi (Router)     │
                                  └───────────┬────────────┘
                                              │
            ┌──────────────┬──────────────────┼──────────────────┬──────────────┐
            │              │                  │                  │              │
    ┌───────▼──────┐ ┌─────▼───────┐  ┌───────▼──────┐  ┌────────▼─────┐ ┌──────▼──────┐
    │ 🟣 Sirius    │ │ 🟢 Orion    │  │ 🔵 Vega      │  │ 🔴 Lyra      │ │ 🟡 Polaris  │
    │ (Araştırma)  │ │ (Yazılım)   │  │ (Matematik)  │  │ (Metin & Ed) │ │ (Baş Mimar) │
    └───────┬──────┘ └─────┬───────┘  └───────┬──────┘  └────────┬─────┘ └──────┬──────┘
            │              │                  │                  │              │
            └──────────────┴──────────────────┼──────────────────┴──────────────┘
                                              │
                                  ┌───────────▼────────────┐
                                  │  🛡️ Aegis / Reviewer   │
                                  └───────────┬────────────┘
                                              │
                                  ┌───────────▼────────────┐
                                  │     Canlı Yanıt &      │
                                  │     Sandbox Frame      │
                                  └────────────────────────┘
```

1. **🧭 Navi (Yönetici & Yönlendirici):** İstekleri analiz edip iş yükünü en uygun ajana paylaştıran orkestratör.
2. **🟡 Polaris (Baş Mimar):** Karmaşık hedefleri çok adımlı görevlere bölen, sistem mimarilerini kuran ve münazara kararlarını sentezleyen stratejist.
3. **🟣 Sirius (Web & Derin Araştırma):** Tavily ve DuckDuckGo motorlarıyla gerçek zamanlı internet araştırması yapan, veri sentezleyen ajan.
4. **🟢 Orion (Yazılım Mühendisi):** İzole ortamda Python, JavaScript, HTML, CSS ve SQL kodu üreten ve test eden uzman.
5. **🔵 Vega (Matematik & Fizik):** Sembolik hesaplama, doğrusal cebir, olasılık ve diferansiyel denklemleri KaTeX ile çözen analist.
6. **🔴 Lyra (İçerik & Metin Yazarı):** Raporlama, teknik dokümantasyon, blog yazıları ve editoryal içerik üreten yazar.
7. **🟠 Rigel (Görsel Analist):** Çoklu modlu (Multimodal) görsel anlama, şema ve veri grafiği analiz ajanı.
8. **⚪ Nova (Hafıza & Genel Asistan):** Uzun vadeli kullanıcı hafızasını yöneten ve genel sohbetleri yürüten asistan.
9. **🎙️ Münazara Odası (Debate Team):** Sirius (Tez) vs Orion (Antitez) fikir çatışması ve Polaris'in nihai konsensüs sentezi.

---

## 🛡️ 5. Güvenlik ve İzolasyon Mimarisi

* **🛡️ Aegis Güvenlik Kalkanı:** Orion'un kod çalıştırma ortamında zararlı sistem çağrılarını (`os.system`, `subprocess`, `rm -rf`, `eval`, tehlikeli modül importları) engelleyen AST ve Regex tabanlı filtreleme.
* **📁 İzole Workspace:** Kod çalıştırma ve dosya işlemleri her oturum için özel oluşturulan `workspaces/<session_id>` dizinlerinde tecrit edilir.
* **🔒 Sandbox Iframe Koruması:** Tarayıcıdaki Canlı Kod Önizleme pencereleri `sandbox="allow-scripts"` kısıtlaması altında çalıştırılarak ana sayfa DOM'una erişim engellenir.

---

## 🚀 6. Kurulum ve Başlangıç

### Gereksinimler
* Python 3.10 veya üzeri
* Modern web tarayıcısı (Chrome, Edge, Safari, Firefox)
* Geçerli bir Google Gemini, Groq, OpenAI veya Anthropic API anahtarı

### Adım 1: Projeyi Klonlayın
```bash
git clone https://github.com/yusufibrahimbasaran/Navi.git
cd Navi
```

### Adım 2: Sanal Ortamı Kurun ve Paketleri Yükleyin
```bash
# Sanal ortam oluşturma
python -m venv venv

# Sanal ortamı aktifleştirme (Windows)
venv\Scripts\activate
# Sanal ortamı aktifleştirme (Linux/Mac)
source venv/bin/activate

# Bağımlılıkları yükleme
pip install -r requirements.txt
```

### Adım 3: Çevre Değişkenlerini Ayarlayın
Ana dizinde `.env` dosyası oluşturun ve kullanmak istediğiniz anahtarları ekleyin:
```env
# Zorunlu veya İsteğe Bağlı LLM Anahtarları
GOOGLE_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Araştırma Ajanı İçin (İsteğe Bağlı)
TAVILY_API_KEY=your_tavily_api_key_here
```

### Adım 4: Uygulamayı Başlatın
```bash
python app.py
```
Sunucu başladığında tarayıcınızdan **`http://127.0.0.1:5001`** adresine gidin.

---

## 🔌 7. API ve Uç Noktalar (Endpoints)

| Yöntem | Uç Nokta | Açıklama |
| :--- | :--- | :--- |
| `POST` | `/api/chat` | Çoklu-ajan SSE (Server-Sent Events) canlı akış yanıtı üretir. |
| `GET` | `/api/chats` | Kullanıcının geçmiş sohbet oturumlarını listeler. |
| `GET` | `/api/chats/<id>` | Belirli bir oturumun tüm mesaj geçmişini çeker. |
| `PUT` | `/api/chats/<id>` | Sohbet başlığını yeniden adlandırır (`rename`). |
| `DELETE` | `/api/chats/<id>` | Oturumu ve ilişkili mesajları siler. |
| `POST` | `/api/upload` | Belge (`.pdf`, `.docx`, `.txt`, `.csv`) veya görsel yükler. |
| `POST` | `/api/auth/login` | Kullanıcı kimlik doğrulama ve oturum açma. |
| `POST` | `/api/auth/register` | Yeni kullanıcı kaydı oluşturma. |
| `POST` | `/api/auth/logout` | Aktif oturumu sonlandırma. |

---

## 🗺️ 8. Sürüm Yol Haritası (Changelog)

* **v3.6.0 (Ağustos 2026 - Mevcut):**
  * 🌌 Siber Noktalı Izgara (Dot-Matrix) & Süzülen Ambiyans Işığı (Ambient Glow).
  * ⌨️ `@` Ajan & `/` Komut Hızlı Açılır Menüsü (Keyboard Navigable).
  * 🎛️ İnteraktif Spotlight Efekti & Ajan Odak Modlu Bento Grid.
  * 📐 Sol Bar Akıllı Katlama (`◀` / `☰`), Canlı Geçmiş Araması ve Tarih Gruplandırması.
  * 🧩 Akıllı Çoklu Blok Canlı Sandbox Birleştiricisi (Unified Live Preview).
* **v3.5.0:**
  * Canlı Ajan Düşünce Akordeonu, Nabız Rozeti ve Üretim Durdurma (AbortController).
  * Çift Sütunlu VS Münazara Odası ve Renk Kimlikleri.
  * KaTeX Matematik Desteği ve Markdown/JSON/PDF Dışa Aktarma.
* **v3.0.0:**
  * Çoklu Ajan (Sirius, Orion, Vega, Polaris, Lyra, Rigel, Nova) Rol Tabanlı Zeka Sistemi.
  * Aegis Güvenlik Kalkanı ve İzole Python Çalışma Alanı.

---

## 👨‍💻 Geliştirici & Lisans

* **Geliştirici:** Yusuf İbrahim Başaran / VastAI
* **GitHub:** [@yusufibrahimbasaran](https://github.com/yusufibrahimbasaran)
* **Lisans:** Bu proje [MIT Lisansı](LICENSE) altında açık kaynak olarak lisanslanmıştır.

<div align="center">

⭐ **Navi'yi beğendiyseniz GitHub'da yıldız vermeyi unutmayın!** ⭐

</div>
