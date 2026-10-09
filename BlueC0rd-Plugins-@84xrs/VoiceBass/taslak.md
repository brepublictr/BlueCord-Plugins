# Mic Bass Boost & Voice Modulator - Yol Haritası ve Mimari Taslak

Bu belge, **yamacokhavali/xdr3venge2** projesinin incelenmesi sonucunda tespit edilen teknik engelleri ve hedeflenen mikrofon efekti (boğuk/ağır bass boost/earrape) için uygulanabilecek alternatif çözümleri özetler.

---

## 1. Mevcut Kodun Durumu ve Teknik Engel

### 1.1. Neden Çalışmadı?
* **İlk Girişim (`AudioContext` / `BiquadFilter`):** 
  Discord mobil (React Native) ortamında mikrofon sinyalleri JavaScript katmanına uğramaz; doğrudan işletim sistemi ve native C++ (WebRTC MediaEngine) tarafından işlenir. Bu yüzden JS tarafında açılan bir `AudioContext` mikrofon akışına etki edemez.
* **Mevcut Durum:** 
  Kod son commit'te sadece `onLoad(api)` loglaması yapan içi boş bir test taslağına dönüştürülmüş.

---

## 2. Olası Çözüm Yolları (Karar Seçenekleri)

| Seçenek | Platform | Gerçek Frekans Filtresi (EQ/Bass)? | Aşırı Ses / Patlama (Earrape)? | Zorluk & Kararlılık |
| :--- | :--- | :--- | :--- | :--- |
| **A) Revenge / Bunny Plugin (Mobil Hack)** | Discord Mobil | ❌ (C++ katmanı kısıtı) | ✅ (Limit kaldırma %500+) | Orta (Mobil Discord güncellemelerine duyarlı) |
| **B) Masaüstü Discord (Vencord/BetterDiscord)** | PC Discord | ✅ (WebRTC AudioTrack hook) | ✅ (AudioContext gain + EQ) | Kolay - Orta (Geniş kütüphane desteği) |
| **C) Yerel Sanal Mikrofon Sürücüsü/Scripti** | PC / Mobil Harici | ✅ (Tam EQ + Distortion + Bass) | ✅ (İstenen seviyede) | Çok Kararlı (Discord'dan bağımsız) |

---

### Seçenek A: Discord Mobil (Revenge / Bunny) Eklentisi Olarak Devam Etmek
Eğer hedef mutlaka **mobil Discord** ise:
* **Ne Yapılabilir?**
  1. `MediaEngineStore` veya `MediaEngine` modülleri tespit edilir.
  2. `setInputVolume` fonksiyonuna patch/hook atılarak normalde %100 olan tavan limit %500 - %2000 arasına çekilir (Audio Overdrive).
  3. Gürültü engelleme (`NoiseSuppression`), eko iptali (`EchoCancellation`) ve otomatik ses dengeleme (`AGC`) kapatılır; mikrofon saf ve distorsiyonlu şekilde patlatılır.
  4. Basit bir Ayarlar (Settings) UI paneli eklenerek bas/güç seviyesi ayarlanabilir yapılır.

---

### Seçenek B: PC Discord (Vencord / Desktop Eklentisi)
Eğer hedef masaüstü Discord ise:
* **Ne Yapılabilir?**
  1. Electron/WebRTC üzerindeki `navigator.mediaDevices.getUserMedia` araya girilerek yakalanır.
  2. Gelen ses akışı gerçek bir `AudioContext.createBiquadFilter()` (`lowshelf` bas güçlendirme ve `lowpass` boğma) filtrelere bağlanır.
  3. Oluşturulan yeni filtrelenmiş ses akışı Discord'un ses bağlantısına verilir.
  4. Sonuç: Gerçek, ağır, boğuk ve tam bas efekti.

---

### Seçenek C: Harici Python / Virtual Audio Scripti
* **Ne Yapılabilir?**
  1. `sounddevice` veya `PyAudio` ile mikrofon dinlenir.
  2. DSP kütüphaneleriyle bas artırılır, boğulma efekti verilir.
  3. Çıktı sanal bir mikrofon kablosuna (VB-Cable) aktarılır.
  4. Discord'da giriş aygıtı olarak bu sanal kablo seçilir. Her platformda ve her uygulamada sıfır riskle çalışır.

---

## 3. Karar ve Eylem Planı

Aşağıdaki başlıklardan hangisiyle ilerlemek istediğimize karar verip kodlamaya geçebiliriz:

1. **[Önerilen Mobil Yol]** Seçenek A: Mevcut Revenge reposundaki eklentiyi düzeltip, Metro API üzerinden `MediaEngine` ses çarpanını sınırsız artıran ve ayarlar arayüzü olan çalışan bir Revenge eklentisi haline getirmek.
2. **[Gerçek EQ Filtresi İstiyorsan]** Seçenek B (Vencord/PC) veya Seçenek C (Bağımsız ses aracı).
