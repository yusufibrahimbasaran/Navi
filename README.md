# Navi 3.2: Otonom Çoklu Ajan (Multi-Agent) Sistemi & Münazara Odası

**Geliştirici:** Yusuf İbrahim Başaran / VastAI  
**Sürüm:** 3.2.0 (Stabilizasyon, Münazara Odası & Hata Düzeltmeleri)  
**Tarih:** Ağustos 2026  

---

## 1. Yönetici Özeti (Executive Summary)
Navi, LangChain ve LangGraph temellerine dayanan şeffaf ve modüler bir **Ajan Ekosistemi (Agentic Workflow)** prototipidir. 

**Navi 3.2 güncellemesi**, sistemdeki kritik akış formatlarını, bellek veri tabanı model uyumsuzluklarını ve çoklu ajan münazara mekanizmasını tam kararlılığa kavuşturmuştur.

---

## 2. Navi 3.2 ile Gelen Yenilikler ve Düzeltmeler

*   🎙️ **Münazara Odası (Debate Mode) Stabilizasyonu:** Ajanlar arası münazara akışındaki SSE formatlama ve JSON ayrıştırma sorunları giderildi. Sirius (Araştırmacı), Orion (Yazılımcı) ve Polaris (Baş Mimar) arasındaki beyin fırtınası ve sentez süreci canlı olarak akıcı hale getirildi.
*   🧠 **Kullanıcı Belleği (UserMemory) Düzeltmesi:** Kullanıcı kaydı sırasında meslek ve ilgi alanlarının kalıcı belleğe (FAISS & SQLite) aktarılmasındaki sütun adı uyumsuzluğu (`fact`) çözüldü.
*   🚦 **Router Optimizasyonu:** Yönlendirici ajanın karar ağacındaki mükerrer kontrol blokları temizlendi, yönlendirme gecikmesi azaltıldı.
*   🛡️ **Denetmen Ajan (Reviewer) İstisnası:** Genel sohbet ve gündelik diyalogların (`Nova`) gereksiz yere denetmen döngüsüne girmesi engellenerek yanıt süresi hızlandırıldı.
*   🧹 **Kod Temizliği & İzolasyon:** Atıl RAG kodları temizlendi ve Aegis güvenlik kalkanı ile workspace izolasyonu korundu.

---

## 3. Temel Yapıtaşları ve Mimari

*   **Yönlendirici (Router) Mimarisi:** Gelen kullanıcı isteklerini analiz ederek (Zero-shot classification) en uygun departman uzmanına atayan "Yönetici Ajan" (Navi).
*   **Model Agnostik Fallback:** Gemini, OpenAI ve Anthropic modelleri arasında otomatik hata toleransı ve geçiş desteği (`with_fallbacks`).
*   **🛡️ Aegis Güvenlik Kalkanı:** Orion'un kod çalıştırma ortamında zararlı sistem çağrılarını (`os.system`, `subprocess`, `rm -rf`, `eval`) engelleyen Regex tabanlı güvenlik filtresi.
*   **📁 Workspace İzolasyonu:** Kod ve dosya işlemlerinin oturum bazlı `workspaces/<session_id>` dizinlerinde izole edilmesi.
*   **🛑 Denetmen Ajan (Reviewer):** Üretilen uzman yanıtlarının kalite ve güvenlik testinden geçirilerek gerekirse revize edilmesi.
*   **Şeffaf Siber-Modern Arayüz:** SSE (Server-Sent Events) ile ajanların düşünme, araç kullanma ve gözlem süreçlerinin canlı akışı.

---

## 4. Yıldız Ajan Kadrosu (Takım Mimarisi)

1.  **Navi (Yönetici / Router):** İstekleri analiz edip doğru departmana yönlendiren yönetici zeka.
2.  **Polaris (Baş Mimar):** Çok adımlı projeleri stratejik adımlara bölen ve münazaraları sentezleyen baş mimar.
3.  **Sirius (Araştırmacı):** İnternet araması ve web sayfası okuma yeteneğine sahip araştırmacı ajan.
4.  **Orion (Yazılım Uzmanı):** İzole çalışma alanında Python kodu yazan ve çalıştıran mühendis.
5.  **Vega (Matematik Uzmanı):** Sembolik hesaplama ve matematiksel çözümler üreten analitik ajan.
6.  **Lyra (Metin Yazarı):** Editoryal, yaratıcı ve edebi metinler üreten yazar.
7.  **Nova (Genel Asistan):** Genel sohbet ve kullanıcı hafızası yönetimi yapan asistan.
8.  **Rigel (Görsel Analist):** Çoklu modlu görsel ve veri inceleme ajanı.
9.  **Münazara Odası (Debate):** Sirius, Orion ve Polaris'in karşıt fikirleri tartışıp en doğru kararı sentezlediği ortak komite.

---

## 5. Navi 4.0 Vizyonu ve Yol Haritası

*   **Mobil Uygulama (React Native):** Yerel iOS ve Android desteği.
*   **Sesli Asistan (STT & TTS):** Gerçek zamanlı sesli interaktif iletişim.
*   **Yeni Nesil RAG Altyapısı (Rigel):** Gelişmiş belge ve çoklu modlu vektör analizi.
