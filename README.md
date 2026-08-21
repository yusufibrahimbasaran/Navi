# Navi 3.1: Stabil Otonom Çoklu Ajan (Multi-Agent) Sistemi

**Geliştirici:** Yusuf İbrahim Başaran / VastAI
**Sürüm:** 3.1.0 (Stabilite & Güvenlik Güncellemesi)
**Tarih:** Ağustos 2026

---

## 1. Yönetici Özeti (Executive Summary)
Navi, LangChain ve LangGraph temellerine dayanan şeffaf ve modüler bir **Ajan Ekosistemi (Agentic Workflow)** prototipidir. Navi 3.1 sürümü, önceki sürümlerde tasarlanan otonom yetenekleri laboratuvar ortamından çıkarıp, uç vakalara (edge cases) karşı dirençli ve hata yapmaz bir stabiliteye kavuşturmuştur.

*Not: Navi, tam otonom ve kusursuz bir ticari şirket simülasyonu değil; otonom yetenekleri test edip geliştirdiğimiz bir AR-GE altyapısıdır.*

---

## 2. Önceki Sürümlerden Kalan Temel Yapıtaşları
*   **Yönlendirici (Router) Mimarisi:** Gelen her kullanıcı isteğini okuyup (Zero-shot classification) görevi en uygun uzmana atayan bir "Yönetici Ajan" (Navi) yapısı.
*   **Model Agnostik Fallback Sistemi (GÜNCELLENDİ):** Sistemin tek bir modele bağımlı olmaması için GPT, Gemini ve Claude modelleri arasında otomatik geçiş kurgulanmıştır. *Groq API altyapısı, yeni modellerinin araç kullanımı (Tool Calling) desteklememesi nedeniyle 3.1 sürümüyle birlikte otomatik model havuzundan (Auto-fallback) geçici olarak çıkarılmış; sistemin ana iskeleti, stabilitesi kanıtlanmış OpenAI (GPT) ve Gemini (3.5-Flash) modellerine emanet edilmiştir.*
*   **Şeffaf Siber-Modern Arayüz:** *Glassmorphism* stiliyle baştan aşağı modern bir tasarım ve SSE Streaming ile ajanların arka plandaki düşünme süreçlerinin saniye saniye ekrana yansıtılması.

---

## 3. Navi 3.1: Stabilite, İzolasyon ve Güvenlik (Mevcut Durum)
Navi 3.1, 3.0 ile gelen iddiaları gerçekten koda döken ve stabil çalışmasını sağlayan "Güvenlik ve İzolasyon" güncellemesidir.

*   **🛡️ Aegis Güvenlik Kalkanı (AKTİF):** Orion (Yazılımcı Ajan) otonom kod yürütme yetkisine sahiptir. Ancak 3.1 güncellemesi ile birlikte `os.system`, `subprocess`, `rm -rf` gibi tehlikeli sistem komutları **Aegis** adlı Regex tabanlı güvenlik kalkanı tarafından anında tespit edilip bloke edilmektedir. Ajanlar artık sunucuyu ele geçiremez.
*   **📁 İzole Çalışma Alanları / Workspace (AKTİF):** Ajanların oluşturduğu veya okuduğu dosyalar artık doğrudan ana proje dizininde değil; ajanların thread-safe bir şekilde içine hapsedildiği özel `workspaces/local_user` dizininde yürütülür. Sistem dosyaları tamamen güvendedir.
*   **🛑 Denetmen Ajan / Reviewer (AKTİF):** Üretilen çıktılar doğrudan kullanıcıya sunulmadan önce "Reviewer" ajan tarafından incelenir. 3.1 güncellemesiyle `.upper()` tip dönüşüm hatası gibi yapısal problemler giderilmiş; döngü (False Negative) kırıcı *Circuit Breaker* sistemi stabilize edilmiştir (Maksimum 1 revizyon).
*   **⚠️ RAG ve Vektör Hafızası (DURDURULDU):** PDF okuma, dosya yükleme ve FAISS entegrasyonu, mevcut altyapı kütüphanelerinde yaşanan derin çatışmalar nedeniyle **Navi 3.1 sürümünde geçici olarak devre dışı bırakılmıştır.** (Hedef Navi 4.0).

---

## 4. Yıldız Ajan Kadrosu (Takım Mimarisi)
Sistemde aktif olarak çalışan 7 farklı departman bulunmaktadır:

1.  **Navi (Yönetici / Router):** İstekleri analiz edip doğru odaya yönlendiren kapıdaki zeka.
2.  **Polaris (Baş Mimar):** Büyük ve çok adımlı projeleri küçük görevlere bölen strateji ajanı.
3.  **Sirius (Araştırmacı):** İnternette arama yapabilen bilgi avcısı.
4.  **Orion (Yazılım Uzmanı):** Çalışma alanında (Workspace) izole olarak Python kodu yazan, çalıştıran mühendis.
5.  **Vega (Matematik Uzmanı):** LLM'lerin matematikte halüsinasyon görmesini engellemek için sembolik hesaplama ile deterministik sonuçlar üreten analitik ajan.
6.  **Lyra (Metin Yazarı):** Editoryal içeriklerde uzmanlaşmış ajan.
7.  **Münazara Odası (Debate):** Araştırmacı ile Yazılımcı ajanların birbiriyle tartıştığı, Baş Mimar'ın sentez yaptığı çoklu-ajan beyin fırtınası komitesi.

---

## 5. Navi 4.0 Vizyonu ve Yol Haritası (Gelecek Hedefleri)
Navi 3.1 ile core (çekirdek) otonomi sistemleri stabilize edildikten sonra, Navi 4.0 için hedeflenen adımlar şunlardır:

*   **Mobil Uygulama (React Native):** Navi'nin yeteneklerini cebinize taşıyacak, yerel (native) iOS ve Android uygulamaları.
*   **Sesli Asistan (Voice / STT & TTS):** Sistemle klavye kullanmadan, doğrudan sesli olarak interaktif şekilde konuşabilme yeteneği.
*   **Gelişmiş Görsel ve Belge Analizi (Rigel Dönüşü):** Navi 3.1'de rafa kaldırılan RAG sisteminin, yapay zekanın "görme" (Vision) yetenekleriyle birleşerek kusursuz bir belge analiz aracına (Rigel) dönüştürülmesi.
