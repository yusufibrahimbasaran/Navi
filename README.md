# Navi 3.5: Yeni Nesil Otonom Çoklu-Ajan Ekosistemi & Canlı İnteraktif Sandbox

**Geliştirici:** Yusuf İbrahim Başaran / VastAI  
**Sürüm:** 3.5.0 (Canlı Akış Akordeonu, Münazara Arenası, Canlı Kod Önizleme, KaTeX & Dışa Aktarma)  
**Tarih:** Ağustos 2026  
**GitHub:** [yusufibrahimbasaran/Navi](https://github.com/yusufibrahimbasaran/Navi)

---

## 1. Yönetici Özeti (Executive Summary)
Navi 3.5, LangChain ve LangGraph temellerine dayanan şeffaf, modüler ve yüksek performanslı bir **Çoklu-Ajan (Multi-Agentic) Zeka Ekosistemi** platformudur. 

**Navi 3.5 güncellemesi**, modern web geliştirme ve yapay zeka arayüz standartlarını bir araya getirerek:
* Canlı Ajan Düşünce Akordeonunu,
* Çift sütunlu Münazara Arenasını (Debate Arena),
* HTML/CSS/JS/SVG için anlık çalışan **Canlı Kod Sandbox (Live Preview)** önizleyicisini,
* KaTeX tabanlı LaTeX matematik rendering desteğini,
* Tek tıkla Markdown (.md), JSON ve PDF sohbet dışa aktarma yeteneğini sunar.

---

## 2. Navi 3.5 ile Eklenen Başlıca Özellikler (Paket A, B & C)

### 🌟 Paket A: Canlı Akış & Şeffaf Düşünce Akordeonu
- **Katlanabilir Düşünce Akordeonu (`<details class="thought-accordion">`):** Ajanların karmaşık araç çağırma ve gözlem adımları şık ve katlanabilir bir zaman çizelgesinde gruplanır.
- **Canlı Zamanlayıcı ve Nabız Rozeti (`.agent-status-badge`):** Hangi ajanın çalıştığı, geçen süre (saniye bazında) ve durum nabız animasyonuyla anlık gösterilir.
- **Durdur Butonu (AbortController):** Uzun yanıt üretimleri kullanıcı tarafından tek tıkla durdurulabilir.

### 🎙️ Paket B: Münazara Odası Çift Sütunlu VS Arenası & Ajan Renk Kimlikleri
- **VS Münazara Düzeni (`.debate-arena`):** Sirius (Tez) ve Orion (Antitez) argümanları yan yana çift sütunlu arenada kapışır, Polaris ise altın rengi sentez kartında nihai mimari kararı açıklar.
- **Dinamik Ajan Renk Kimlikleri:**
  - 🟣 **Sirius (Araştırmacı):** Mor (`#8b5cf6`), `fa-brain`
  - 🟢 **Orion (Yazılımcı):** Zümrüt Yeşili (`#10b981`), `fa-code`
  - 🔵 **Vega (Matematikçi):** Cyan Camgöbeği (`#06b6d4`), `fa-calculator`
  - 🟡 **Polaris (Baş Mimar):** Altın Sarısı (`#f59e0b`), `fa-compass`
  - 🔴 **Lyra (Metin Yazarı):** Yakut Kırmızı (`#f43f5e`), `fa-feather`
  - 🟠 **Rigel (Görsel Analist):** Güneş Turuncusu (`#f97316`), `fa-eye`
  - ⚪ **Nova (Genel Asistan):** Gece Mavisi (`#6366f1`), `fa-circle-nodes`
  - 🔍 **Denetmen (Reviewer):** Turkuaz Zırh (`#14b8a6`), `fa-shield-halved`

### 💻 Paket C: Gelişmiş Kod Blokları, KaTeX & Sohbet Dışa Aktarma
- **Canlı Kod Önizleme (Live Sandbox):** Üretilen HTML, CSS, JavaScript ve SVG kod bloklarında tek tıkla canlı çalışan sonucu sohbet içinde görme desteği (`<iframe>` sandbox).
- **Satır Numaraları & Tam Ekran Modu:** Fira Code tipografisi, satır numaralandırması ve tam ekran modal genişletmesi.
- **📐 KaTeX / LaTeX Desteği:** Karmaşık matematik denklemlerinin kusursuz vektörel çizimi.
- **📤 Sohbet Dışa Aktarma (Export):** Sohbet geçmişini tek tıkla **Markdown (.md)**, **JSON** veya yazdırılabilir **PDF** formatında indirme.

---

## 3. Yıldız Ajan Kadrosu (Takım Mimarisi)

1. **Navi (Yönetici / Router):** İstekleri analiz edip doğru departmana yönlendiren yönetici zeka.
2. **Polaris (Baş Mimar):** Çok adımlı projeleri stratejik adımlara bölen ve münazaraları sentezleyen baş mimar.
3. **Sirius (Araştırmacı):** İnternet araması ve web sayfası okuma yeteneğine sahip araştırmacı ajan.
4. **Orion (Yazılım Uzmanı):** İzole çalışma alanında Python kodu yazan ve çalıştıran mühendis.
5. **Vega (Matematik Uzmanı):** Sembolik hesaplama ve matematiksel çözümler üreten analitik ajan.
6. **Lyra (Metin Yazarı):** Editoryal, yaratıcı ve edebi metinler üreten yazar.
7. **Nova (Genel Asistan):** Genel sohbet ve kullanıcı hafızası yönetimi yapan asistan.
8. **Rigel (Görsel Analist):** Çoklu modlu görsel ve veri inceleme ajanı.
9. **Münazara Odası (Debate):** Sirius, Orion ve Polaris'in karşıt fikirleri tartışıp en doğru kararı sentezlediği ortak komite.

---

## 4. Güvenlik & İzolasyon Mimarisi

* **🛡️ Aegis Güvenlik Kalkanı:** Orion'un kod çalıştırma ortamında zararlı sistem çağrılarını (`os.system`, `subprocess`, `rm -rf`, `eval`) engelleyen Regex tabanlı güvenlik filtresi.
* **📁 Workspace İzolasyonu:** Kod ve dosya işlemlerinin oturum bazlı `workspaces/<session_id>` dizinlerinde izole edilmesi.
* **🛑 Denetmen Ajan (Reviewer):** Üretilen uzman yanıtlarının kalite ve güvenlik testinden geçirilerek gerekirse revize edilmesi.
* **🔒 Sandboxed Code Execution:** Tarayıcı tarafındaki Canlı Önizleme iframe'lerinin `sandbox="allow-scripts"` ile izole çalıştırılması.

---

## 5. Kurulum ve Çalıştırma

```bash
# Bağımlılıkları yükleyin
pip install -r requirements.txt

# Çevre değişkenlerini ayarlayın (.env)
GOOGLE_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key

# Sunucuyu başlatın
python app.py
```

Tarayıcınızdan `http://127.0.0.1:5001` adresine gidin.
