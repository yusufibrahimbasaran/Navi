# Navi 3.0: Otonom Yapay Zeka Mimarisi Kapsamlı Dokümantasyonu

**Geliştirici:** Yusuf İbrahim Başaran / VastAI
**Sürüm:** 3.0.0 (Otonom & Multi-Agent Framework)
**Tarih:** Ağustos 2026

---

## 1. Yönetici Özeti (Executive Summary)
Navi, basit bir "Soru-Cevap" (Chatbot) uygulamasından ziyade, LangChain ve LangGraph temellerine dayanan bir **Ajan Ekosistemi (Agentic Workflow)** olarak tasarlanmıştır. Navi 3.0 sürümü, çoklu ajan (multi-agent) mimarisinin sınırlarını zorlayarak sistemin yapısal bir "Yapay Zeka Departmanları" simülasyonu olarak çalışmasını hedefler. 

*Not: Navi, tam otonom ve kusursuz bir ticari şirket simülasyonu değil; otonom yetenekleri test edip geliştirdiğimiz, şeffaf ve modüler bir AR-GE altyapısıdır.*

---

## 2. Navi 1.0: Temeller ve Çoklu Ajan (Multi-Agent) Doğuşu
*   **Yönlendirici (Router) Mimarisi:** Gelen her kullanıcı isteğini okuyup (Zero-shot classification) görevi en uygun uzmana atayan bir "Yönetici Ajan" yapısı kuruldu.
*   **Temel Araç Kullanımı (Tool Calling):** Ajanların dış dünyayla bağlantı kurabilmesi sağlandı. İnternette arama yapabilme ve dış kaynaklara erişim yetenekleri eklendi.
*   **Model Agnostik Altyapı:** Sistemin tek bir modele bağımlı olmaması için Groq (Llama), Gemini, Claude ve GPT modelleri arasında otomatik geçiş (Fallback) yapabilen esnek bir yapı kurgulandı.

---

## 3. Navi 2.0: Görsel Devrim, Şeffaflık ve Denetim
*   **Kusursuz Siber-Modern Arayüz (UI):** *Glassmorphism* stiliyle baştan aşağı modern bir tasarıma geçildi. Göz yormayan koyu tema ve estetik mesaj balonları eklendi.
*   **Canlı Veri Akışı (SSE Streaming):** Ajanların araç kullanımları ve düşünme süreçleri saniye saniye ekrana yansıtılarak tam bir şeffaflık sağlandı.
*   **Denetmen Ajan (Reviewer) Darboğazı ve Devre Kesici:** Üretilen çıktılar doğrudan kullanıcıya sunulmadan önce "Reviewer" ajan tarafından incelenir. 
    *   *Circuit Breaker (Devre Kesici):* Reviewer mimarisi, latency (gecikme) ve API maliyetlerini artırabileceği için bir üst sınır (max_revisions) getirilmiştir. Eğer sistem aynı döngüye girip (False Negative) reddedilmeye devam ederse, üst sınıra ulaşıldığında sistem döngüyü zorla kırar ve "Maksimum revizyona ulaşıldı" uyarısıyla elde edilen en iyi sonucu kullanıcıya (insana) iletir.

---

## 4. Navi 3.0: Tam Otonomi ve Gelişmiş Bilişsel Yetenekler
En büyük sıçrama olan Navi 3.0, sistemin "yaşayan ve öğrenen" bir yapıya kavuşmasını sağladı.

*   **🧠 Dinamik Vektör Hafızası (FAISS Memory Scoring) ve Gizlilik:** Kullanıcının kişisel bilgileri, FAISS vektör veritabanına işlenerek sorulara özel "Alaka Puanlaması (Scoring)" yapılır. 
    *   *Veri Gizliliği:* Toplanan tüm kişisel vektör verileri lokal sistemde (`/faiss_db`) tutulur. Kullanıcı, dikey ayarlar menüsündeki "Vektör Hafızayı Sıfırla" butonuyla tüm kişisel izlerini ve geçmişini **tek tıkla ve kalıcı olarak silebilir**.
*   **🛡️ Aegis (Güvenlik Kalkanı):** Otonom kod yürütme yetkisi taşıyan ajanların "rm -rf" veya sistem dizini okuma gibi zararlı eylemleri gerçekleştirmesini önlemek için kurulan Regex tabanlı güvenlik kalkanı (Guardrail).
*   **📁 İzole Çalışma Alanları (Workspace Sistemi):** Ajanların oluşturduğu veri dosyaları (CSV, TXT, kod) her oturuma özel izole `/workspaces/session_id` klasörlerinde çalıştırılır.
*   **⚙️ Auto-Correction (Otomatik Hata Ayıklama):** Kod yazan ajan (Orion), yazdığı kod hata verdiğinde döngüye girer. Maksimum 3 deneme sonucunda hata çözülemezse, ajan sessizce durmaz; hatanın son halini ekrana basarak problemi **kullanıcıya (insana) eskale eder**.
*   **🎙️ Ajanlar Arası Münazara (Multi-Agent Debate):** İki farklı teknolojiyi kıyaslarken sistem "Münazara Odası"nı açar. Araştırmacı ajan bir tezi savunurken, Yazılımcı ajan çürütmeye çalışır. Baş Mimar ajan ise bu fikirleri sentezler. 

---

## 5. Yıldız Ajan Kadrosu (Takım Mimarisi)
1.  **Navi (Yönetici / Router):** İstekleri analiz edip doğru odaya yönlendiren kapıdaki zeka.
2.  **Polaris (Baş Mimar):** Büyük ve çok adımlı projeleri küçük görevlere bölen strateji ajanı.
3.  **Sirius (Araştırmacı):** İnternetteki güncel verileri tarayan veri avcısı.
4.  **Orion (Yazılım Uzmanı):** Çalışma alanında kod yazan ve otonom hata ayıplayabilen mühendis.
5.  **Vega (Matematik Uzmanı):** LLM'lerin matematikte halüsinasyon görme (yanlış hesaplama) zafiyetini aşmak için, matematiksel ifadeleri doğrudan sembolik hesaplama araçlarıyla (Python eval/math modülleri) çözerek %100 kesin (deterministik) sonuçlar üreten analitik ajan.
6.  **Lyra (Metin Yazarı):** Blog yazıları ve editoryal içeriklerde uzmanlaşmış ajan.

---

## 6. Navi 4.0 Vizyonu ve Yol Haritası (Gelecek Hedefleri)
Şu an aktif olmayan ancak ar-ge aşamasında olan bir sonraki sürüm hedefleri:
*   **Rigel (Veri / Görsel Analist):** Kullanıcıların PDF, Excel veya görsel (Vision) yükleyip tam kapsamlı RAG mimarisiyle derin analiz yaptırabileceği yeni nesil ajan.
*   **React Native Mobil App:** Sadece web üzerinde değil, iOS ve Android cihazlarda cebinizde taşıyabileceğiniz yerel uygulamalar.
*   **Sesli Asistan (Voice/TTS):** Yazı ötesine geçerek insan-makine etkileşimini doğrudan ses dalgalarına taşıyacak STT/TTS entegrasyonu.
