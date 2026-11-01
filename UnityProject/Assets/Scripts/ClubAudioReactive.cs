using UnityEngine;

namespace TikTokLiveGame
{
    // Analyze only the music source so gift sounds do not retrigger the bass detector.
    public sealed class ClubAudioReactive : MonoBehaviour
    {
        private AudioSource source;
        private readonly float[] spectrum = new float[1024];
        private readonly float[] samples = new float[512];
        private readonly float[] bands = new float[24];
        private float averageBass = 0.001f;
        private float previousBass;
        private float nextBeatAt;
        private float nextReportAt = 10f;
        private float peakRms;
        private int beats;
        public static ClubAudioReactive Instance { get; private set; }
        public static float Bass { get; private set; }
        public static float Energy { get; private set; }
        public static float Pulse { get; private set; }
        public static bool Playing { get; private set; }
        public static float Band(int index) => Instance == null ? 0f : Instance.bands[Mathf.Abs(index) % 24];

        public void Initialize(AudioSource music) { source = music; Instance = this; }

        private void Update()
        {
            float dt = Mathf.Min(Time.unscaledDeltaTime, 0.1f);
            Pulse *= Mathf.Exp(-dt * 9f);
            Playing = source != null && source.isPlaying;
            if (!Playing)
            {
                Bass = Mathf.Lerp(Bass, 0f, dt * 8f);
                Energy = Mathf.Lerp(Energy, 0f, dt * 8f);
                Publish();
                return;
            }
            source.GetSpectrumData(spectrum, 0, FFTWindow.BlackmanHarris);
            source.GetOutputData(samples, 0);
            float squareSum = 0f;
            foreach (float sample in samples) squareSum += sample * sample;
            float rms = Mathf.Sqrt(squareSum / samples.Length);
            peakRms = Mathf.Max(peakRms, rms);
            float bass = 0f;
            int lastBin = Mathf.Clamp(Mathf.CeilToInt(180f * spectrum.Length * 2f / AudioSettings.outputSampleRate), 2, 30);
            for (int i = 1; i <= lastBin; i++) bass += spectrum[i];
            averageBass = Mathf.Lerp(averageBass, bass, 1f - Mathf.Exp(-dt * 1.8f));
            float ratio = bass / Mathf.Max(averageBass, 0.00001f);
            if (rms > 0.001f && bass > 0.00005f && ratio > 1.18f && bass > previousBass * 1.04f && Time.unscaledTime >= nextBeatAt)
            {
                Pulse = Mathf.Clamp01((ratio - 1f) * 1.8f);
                nextBeatAt = Time.unscaledTime + 0.18f;
                beats++;
            }
            previousBass = bass;
            Bass = Mathf.Lerp(Bass, rms > 0.001f ? Mathf.Clamp01(ratio * 0.45f) : 0f, 1f - Mathf.Exp(-dt * 20f));
            Energy = Mathf.Lerp(Energy, Mathf.Clamp01(rms * 3.5f), 1f - Mathf.Exp(-dt * 12f));
            for (int i = 0; i < bands.Length; i++)
            {
                int start = Mathf.Clamp((int)Mathf.Pow(1.3f, i), 1, 900);
                int end = Mathf.Clamp((int)Mathf.Pow(1.3f, i + 1) + 1, start + 1, 1024);
                float total = 0f;
                for (int bin = start; bin < end; bin++) total += spectrum[bin];
                float level = Mathf.Clamp01(Mathf.Sqrt(total / (end - start)) * 14f);
                bands[i] = Mathf.Lerp(bands[i], level, 1f - Mathf.Exp(-dt * 20f));
            }
            Publish();
            if (Time.unscaledTime >= nextReportAt)
            {
                Debug.Log($"AUDIO_REACTIVE rmsPeak={peakRms:F4} bass={Bass:F3} beats={beats}");
                nextReportAt = Time.unscaledTime + 15f;
            }
        }

        private static void Publish()
        {
            Shader.SetGlobalFloat("_ClubAudioBass", Bass);
            Shader.SetGlobalFloat("_ClubAudioEnergy", Energy);
            Shader.SetGlobalFloat("_ClubAudioPulse", Pulse);
        }

        private void OnDisable()
        {
            if (Instance != this) return;
            Instance = null;
            Bass = Energy = Pulse = 0f;
            Playing = false;
            Publish();
        }
    }
}
