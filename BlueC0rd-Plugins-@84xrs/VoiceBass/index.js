/**
 * Mic Bass Boost & Earrape Overdrive Plugin for Revenge / Bunny / Vendetta
 * 
 * Bu eklenti:
 * 1. Discord'un ses motorunu (MediaEngineStore / MediaEngine) tespit eder.
 * 2. setInputVolume sınırını %100'den %1000'e (10x kazanç) zorlayarak mikrofonu overdrive/patlatma moduna sokar.
 * 3. Gürültü engelleme (Krisp / NoiseSuppression), Eko Önleme (EchoCancellation) ve Otomatik Kazanç (AGC)
 *    özelliklerini devre dışı bırakarak ham, distorsiyonlu bas ve boğulma sesini kanala iletir.
 * 4. WebRTC / AudioContext desteği olan ortamlarda BiquadFilter (lowshelf/lowpass) filtresini akışa bağlar.
 */

const TAG = "[MicBassBoost]";

let unpatches = [];
let originalInputVolume = 100;
let mediaEngineModule = null;
let voiceSettingsModule = null;

// Ayarlar ve Yapılandırma
const config = {
    multiplier: 6.0,          // 6x Ses Kazancı (Overdrive Bass)
    disableKrisp: true,       // Krisp/Gürültü engellemeyi kapat
    disableEcho: true,        // Eko iptalini kapat
    disableAGC: true,         // Otomatik ses kısılmasını engelle
    lowShelfGain: 30,         // Bas güçlendirme dB
    lowShelfFreq: 120,        // Bas frekansı Hz
    lowPassFreq: 1400         // Tizleri kesip boğuklaştırma frekansı Hz
};

function getMetro(api) {
    if (api && api.metro) return api.metro;
    if (typeof bunny !== "undefined" && bunny.api && bunny.api.metro) return bunny.api.metro;
    if (typeof vendetta !== "undefined" && vendetta.metro) return vendetta.metro;
    if (typeof revenge !== "undefined" && revenge.metro) return revenge.metro;
    return null;
}

function getPatcher(api) {
    if (api && api.patcher) return api.patcher;
    if (typeof bunny !== "undefined" && bunny.api && bunny.api.patcher) return bunny.api.patcher;
    if (typeof vendetta !== "undefined" && vendetta.patcher) return vendetta.patcher;
    if (typeof revenge !== "undefined" && revenge.patcher) return revenge.patcher;
    return null;
}

function applyAudioOverdrive(metro) {
    if (!metro) return;

    try {
        // 1. MediaEngine ve Ses Kontrol Modüllerini Bul
        mediaEngineModule = metro.findByProps("setInputVolume") || 
                            metro.findByProps("getMediaEngine") || 
                            metro.findByProps("getVoiceFilter") ||
                            metro.findByProps("setAudioInputVolume");

        voiceSettingsModule = metro.findByProps("setEchoCancellation") || 
                              metro.findByProps("setNoiseSuppression") ||
                              metro.findByProps("setAutomaticGainControl");

        if (mediaEngineModule) {
            console.log(TAG, "MediaEngine bulundu! Orijinal fonksiyonlar patchleniyor...");

            // Eğer getMediaEngine varsa iç engine nesnesini çek
            const engine = typeof mediaEngineModule.getMediaEngine === "function" 
                ? mediaEngineModule.getMediaEngine() 
                : mediaEngineModule;

            if (engine && typeof engine.getInputVolume === "function") {
                originalInputVolume = engine.getInputVolume();
            }

            // setInputVolume fonksiyonunu zorla yüksek değere çek
            if (engine && typeof engine.setInputVolume === "function") {
                const targetVolume = Math.min(100 * config.multiplier, 1000);
                engine.setInputVolume(targetVolume);
                console.log(TAG, `Mikrofon hacmi ${targetVolume}% seviyesine zorlandı!`);
            }
        }

        // 2. Krisp, AGC ve Eko İptallerini Kapat (Sesi doğrudan ham & distorsiyonlu patlatmak için)
        if (voiceSettingsModule) {
            if (config.disableKrisp && typeof voiceSettingsModule.setNoiseCancellation === "function") {
                voiceSettingsModule.setNoiseCancellation(false);
            }
            if (config.disableKrisp && typeof voiceSettingsModule.setNoiseSuppression === "function") {
                voiceSettingsModule.setNoiseSuppression(false);
            }
            if (config.disableEcho && typeof voiceSettingsModule.setEchoCancellation === "function") {
                voiceSettingsModule.setEchoCancellation(false);
            }
            if (config.disableAGC && typeof voiceSettingsModule.setAutomaticGainControl === "function") {
                voiceSettingsModule.setAutomaticGainControl(false);
            }
            console.log(TAG, "Gürültü filtreleri kapatıldı: Saf agresif mikrofon akışı devrede.");
        }

    } catch (err) {
        console.error(TAG, "Overdrive uygulama hatası:", err);
    }
}

function hookWebRTCIfAvailable() {
    try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return;
        }

        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

        navigator.mediaDevices.getUserMedia = async function(constraints) {
            const stream = await originalGetUserMedia(constraints);
            if (!constraints || !constraints.audio) return stream;

            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return stream;

                const ctx = new AudioCtx();
                const source = ctx.createMediaStreamSource(stream);

                // 1. Ağır Bas Filtresi (Low-Shelf Boost)
                const bassFilter = ctx.createBiquadFilter();
                bassFilter.type = "lowshelf";
                bassFilter.frequency.value = config.lowShelfFreq;
                bassFilter.gain.value = config.lowShelfGain;

                // 2. Boğuk Ses Filtresi (Low-Pass Filter)
                const lowPass = ctx.createBiquadFilter();
                lowPass.type = "lowpass";
                lowPass.frequency.value = config.lowPassFreq;

                // 3. Distortion / Saturation Gain
                const gainNode = ctx.createGain();
                gainNode.gain.value = config.multiplier;

                const dest = ctx.createMediaStreamDestination();

                source.connect(bassFilter);
                bassFilter.connect(lowPass);
                lowPass.connect(gainNode);
                gainNode.connect(dest);

                console.log(TAG, "WebRTC AudioStream DSP filtresi başarıyla enjekte edildi!");
                return dest.stream;
            } catch (dspErr) {
                console.warn(TAG, "DSP filtreleme sırasında hata oluştu, normal akışa dönülüyor:", dspErr);
                return stream;
            }
        };

        unpatches.push(() => {
            navigator.mediaDevices.getUserMedia = originalGetUserMedia;
        });

    } catch (e) {
        console.warn(TAG, "WebRTC hook desteklenmiyor veya pas geçildi:", e);
    }
}

module.exports = {
    onLoad(api) {
        console.log(TAG, "🚀 Eklenti Yüklendi! Bass Boost & Overdrive hazırlanıyor...");

        const metro = getMetro(api);
        const patcher = getPatcher(api);

        // 1. Metro üzerinden Discord ses modüllerini overdrive yap
        applyAudioOverdrive(metro);

        // 2. Ses kanallarına bağlandıkça veya mikrofon açıldıkça ayarı korumak için patch at
        if (patcher && mediaEngineModule && typeof mediaEngineModule.setInputVolume === "function") {
            try {
                const unpatch = patcher.before("setInputVolume", mediaEngineModule, (args) => {
                    // Kullanıcı veya sistem sesi kısmaya çalışırsa çarpanı uygula
                    if (args && typeof args[0] === "number") {
                        args[0] = Math.min(args[0] * config.multiplier, 1000);
                    }
                });
                unpatches.push(unpatch);
            } catch (patchErr) {
                console.warn(TAG, "Patcher bağlanamadı:", patchErr);
            }
        }

        // 3. WebRTC destekleyen platformlar için canlı ses DSP hook'u
        hookWebRTCIfAvailable();

        console.log(TAG, "✅ Mic Bass Boost tamamen aktif!");
    },

    onUnload() {
        console.log(TAG, "Eklenti kaldırılıyor, ses ayarları sıfırlanıyor...");

        for (const unpatch of unpatches) {
            try {
                if (typeof unpatch === "function") unpatch();
            } catch (e) {}
        }
        unpatches = [];

        // Orijinal ses seviyesini geri yükle
        if (mediaEngineModule && typeof mediaEngineModule.setInputVolume === "function") {
            try {
                mediaEngineModule.setInputVolume(originalInputVolume || 100);
            } catch (e) {}
        }

        console.log(TAG, "Mic Bass Boost kapatıldı.");
    }
};
