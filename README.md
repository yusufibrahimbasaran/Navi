# Navi 3.0: Otonom Yapay Zeka Mimarisi Kapsamlı Dokümantasyonu

**Geliştirici:** Yusuf İbrahim Başaran / VastAI
**Sürüm:** 3.0.0 (Otonom & Multi-Agent Framework)
**Tarih:** Ağustos 2026

---

## 1. Yönetici Özeti (Executive Summary)
Navi, basit bir "Soru-Cevap" (Chatbot) uygulamasından ziyade, kendi kendine karar verebilen, kod yazabilen, araştırma yapan ve hata ayıplayabilen gelişmiş bir **Ajan Ekosistemi (Agentic Workflow)** olarak tasarlanmıştır. Sıfırdan başlanarak adım adım inşa edilen bu mimari, Navi 3.0 sürümüyle birlikte tam otonom bir "Yapay Zeka Şirketi" simülasyonuna dönüşmüştür.

---

## 2. Navi 1.0: Temeller ve Çoklu Ajan (Multi-Agent) Doğuşu
İlk sürüm, sistemin beynini oluşturan temel yönlendirme algoritmalarının atıldığı aşamaydı.

*   **Yönlendirici (Router) Mimarisi:** Tek bir devasa yapay zeka yerine, gelen her kullanıcı isteğini (prompt) okuyup analiz eden ve görevi en uygun uzmana atayan bir "Yönetici Ajan" yapısı kuruldu.
*   **Temel Araç Kullanımı (Tool Calling):** Ajanların dış dünyayla bağlantı kurabilmesi sağlandı. İnternette arama yapabilme (DuckDuckGo/Wikipedia) ve temel matematiksel işlemleri çözebilme yetenekleri eklendi.
*   **Model Agnostik Altyapı:** Sistemin tek bir şirkete (örneğin sadece OpenAI'a) bağımlı olmaması için LangChain kullanılarak Groq (Llama), Gemini, Claude ve GPT modelleri arasında geçiş yapabilen esnek bir yapı kurgulandı.

---

## 3. Navi 2.0: Görsel Devrim, Şeffaflık ve Denetim
İkinci sürüm, sistemin kullanıcıyla olan etkileşimini profesyonelleştiren ve arka plandaki zekayı dizginleyen büyük bir güncellemeydi.

*   **Kusursuz Siber-Modern Arayüz (UI):** *Glassmorphism* (yarı saydam cam) stiliyle baştan aşağı modern bir tasarıma geçildi. Göz yormayan koyu tema, yeni yan menü (Sidebar) ve estetik mesaj balonları eklendi.
*   **Canlı Veri Akışı (SSE Streaming):** Ajanların o an ne düşündüğü, hangi aracı (tool) kullandığı ve hangi aşamada olduğu saniye saniye ekrana yansıtılarak tam bir şeffaflık sağlandı. Kullanıcı artık "Bekleniyor..." yazısı yerine ajanın zihin haritasını izleyebilmeye başladı.
*   **Denetmen Ajan (Reviewer):** Üretilen hiçbir çıktı kullanıcıya doğrudan sunulmamaya başlandı. Çıktılar önce katı bir Denetmen Ajandan geçer; hata, eksik kod veya yanlışlık varsa reddedilerek uzman ajana "Bunu düzelt" komutuyla geri gönderilir.

---

## 4. Navi 3.0: Tam Otonomi ve Gelişmiş Bilişsel Yetenekler
En büyük sıçrama olan Navi 3.0, sistemin sadece cevap veren değil, "yaşayan ve öğrenen" bir yapıya kavuşmasını sağladı.

*   **🧠 Dinamik Vektör Hafızası (FAISS Memory Scoring):** Klasik "sohbet geçmişi" yerine, kullanıcının kişisel bilgileri, mesleği ve zevkleri FAISS vektör veritabanına işlenmeye başlandı. Sistem bu verileri anlamsal olarak (Semantic Search) analiz eder ve her soruda "Bu kullanıcı için hangi hafıza kayıtlarım önemli?" diyerek alaka puanlaması (Scoring) yapar.
*   **🛡️ Aegis (Güvenlik Kalkanı):** Ajanlara bilgisayarda kod çalıştırma yetkisi verildiği için "rm -rf" gibi zararlı sistem komutlarını anında bloke eden, yapay zekanın makineye zarar vermesini önleyen sarsılmaz bir güvenlik kalkanı (Guardrail) inşa edildi.
*   **📁 İzole Çalışma Alanları (Workspace Sistemi):** Ajanların sizin için oluşturduğu dosyalar (Excel, TXT, Python scriptleri vb.) her oturuma özel sanal klasörlerde (Workspace) izole edilir. Ajanlar bu klasörlerdeki verileri okuyup kendi kendilerine test yapabilirler.
*   **⚙️ Auto-Correction (Otomatik Hata Ayıklama):** Kod yazan ajan (Orion), yazdığı kod hata verdiğinde pes etmek yerine hatayı terminalden okur, kendi kodunu analiz eder ve kodu düzeltip (maksimum 3 kez) başarıya ulaşana kadar yeniden çalıştırır.
*   **🎙️ Ajanlar Arası Münazara (Multi-Agent Debate):** İki farklı teknolojiyi kıyaslarken veya felsefi bir karar alırken sistem "Münazara Odası"nı açar. Araştırmacı ajan bir tezi savunurken, Yazılımcı ajan çürütmeye çalışır. Baş Mimar ajan ise bu fikirleri sentezleyerek kullanıcıya en nesnel ve kusursuz raporu sunar.
*   **Dikey Ayarlar (Dashboard):** Sistemin hafıza kontrolleri, Aegis güvenlik durumu ve aktif API'lerin yönetildiği Discord/SaaS tarzı modern dikey ayarlar menüsü entegre edildi.

---

## 5. Yıldız Ajan Kadrosu (Takım Mimarisi)
Sistemdeki görev dağılımı astronomik kod adlarıyla sınıflandırılmıştır:

1.  **Navi (Yönetici / Router):** Gelen her isteği analiz edip doğru odaya yönlendiren kapıdaki zeka.
2.  **Polaris (Baş Mimar):** Büyük ve çok adımlı projeleri küçük görevlere (DAG - Yönlü Asiklik Grafik) bölen lider.
3.  **Sirius (Araştırmacı):** İnternetteki güncel verileri, makaleleri ve haberleri saniyeler içinde tarayıp doğrulayan veri avcısı.
4.  **Orion (Yazılım Uzmanı):** Çalışma alanında Python kodu yazan, çalıştıran, hataları ayıklayan mühendis.
5.  **Vega (Matematik Uzmanı):** Sayısal hesaplamaları halüsinasyon görmeden (tam doğrulukla) çözen analitik zeka.
6.  **Lyra (Metin Yazarı):** Pazarlama metinleri, blog yazıları ve duygusal iletişim konularında uzmanlaşmış yaratıcı ajan.
7.  **Rigel (Veri / Görsel Analist):** Yüklenen tabloları, log dosyalarını veya resimleri inceleyecek (Versiyon 3.5/4.0 hedefleri arasında) vizyoner ajan.

---

## Sonuç
**Navi 3.0**, sadece komut işleyen bir yazılım değil; kullanıcısını tanıyan, kendi kendine düşünen, hata yaptığında bunu fark edip düzelten, tartışan ve güvenlik sınırlarını koruyan modern bir "Dijital Çalışma Arkadaşı"dır. 

*Bir sonraki ufuk (Navi 4.0): React Native ile mobil cihazlarda var olmak, kullanıcısıyla sesli olarak (Voice) dertleşebilmek ve devasa PDF/Belge arşivlerini saniyeler içinde analiz etmektir.*
