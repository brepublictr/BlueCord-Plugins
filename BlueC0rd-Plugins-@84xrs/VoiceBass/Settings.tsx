import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { findByProps } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { Forms, General } from "@vendetta/ui/components";

const { FormSection, FormSwitch, FormSlider, FormRow } = Forms;
const { ScrollView, View, Text } = General;

export default function Settings() {
    useProxy(storage);

    // Varsayılan değerler
    storage.multiplier ??= 6.0;
    storage.disableKrisp ??= true;
    storage.disableEcho ??= true;
    storage.disableAGC ??= true;
    storage.lowShelfGain ??= 30;
    storage.lowShelfFreq ??= 120;
    storage.lowPassFreq ??= 1400;

    return (
        <ScrollView style={{ padding: 16 }}>
            <FormSection title="GÜÇ & OVERDRIVE (EAR RAPE)">
                <FormRow
                    label="Kazanç Çarpanı (Overdrive)"
                    subLabel={`Şu anki güç: ${storage.multiplier}x (%${Math.round(storage.multiplier * 100)})`}
                />
                <FormSlider
                    value={storage.multiplier}
                    onValueChange={(val: number) => {
                        storage.multiplier = Math.round(val * 10) / 10;
                    }}
                    minimumValue={1.0}
                    maximumValue={10.0}
                    step={0.5}
                />
            </FormSection>

            <FormSection title="SES FİLTRELERİ & BOĞULMA">
                <FormSwitch
                    label="Gürültü Engellemeyi Kapat (Krisp / Suppress)"
                    subLabel="Mikrofonun patlamasını ve distorsiyonunu sansürsüz iletir."
                    value={storage.disableKrisp}
                    onValueChange={(v: boolean) => {
                        storage.disableKrisp = v;
                    }}
                />

                <FormSwitch
                    label="Eko Önlemeyi Kapat (Echo Cancellation)"
                    subLabel="Mikrofon yankısını ve kuyu efektini artırır."
                    value={storage.disableEcho}
                    onValueChange={(v: boolean) => {
                        storage.disableEcho = v;
                    }}
                />

                <FormSwitch
                    label="Otomatik Ses Kısılmasını Kapat (AGC)"
                    subLabel="Bağırınca Discord'un sesinizi kısmasını engeller."
                    value={storage.disableAGC}
                    onValueChange={(v: boolean) => {
                        storage.disableAGC = v;
                    }}
                />
            </FormSection>

            <FormSection title="DSP / EQUALIZER AYARLARI (WebRTC)">
                <FormRow
                    label="Bas Güçlendirme (dB)"
                    subLabel={`+${storage.lowShelfGain} dB bas takviyesi`}
                />
                <FormSlider
                    value={storage.lowShelfGain}
                    onValueChange={(val: number) => {
                        storage.lowShelfGain = Math.round(val);
                    }}
                    minimumValue={0}
                    maximumValue={40}
                    step={1}
                />

                <FormRow
                    label="Boğukluk Kesim Frekansı (Low-Pass)"
                    subLabel={`${storage.lowPassFreq} Hz (Düşürdükçe daha kuyu/boğuk olur)`}
                />
                <FormSlider
                    value={storage.lowPassFreq}
                    onValueChange={(val: number) => {
                        storage.lowPassFreq = Math.round(val);
                    }}
                    minimumValue={400}
                    maximumValue={4000}
                    step={100}
                />
            </FormSection>
        </ScrollView>
    );
}
