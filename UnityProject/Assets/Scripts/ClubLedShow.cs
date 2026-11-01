using System.Collections.Generic;
using UnityEngine;

namespace TikTokLiveGame
{
    // Animated geometry and color use the configured BPM clock, independent of video playback.
    public sealed class ClubLedShow : MonoBehaviour
    {
        private readonly List<Led> leds = new();
        private readonly MaterialPropertyBlock block = new();
        private static readonly int ColorId = Shader.PropertyToID("_Color");
        private static readonly int EmissionId = Shader.PropertyToID("_EmissionColor");

        private void Start()
        {
            foreach (Renderer renderer in FindObjectsByType<Renderer>(FindObjectsSortMode.None))
            {
                string name = renderer.name;
                bool bar = name.StartsWith("LED Spectrum") || name.StartsWith("Booth Equalizer");
                if (!bar && !name.StartsWith("LED Wall Diode") && !name.StartsWith("Floor Border") && !name.StartsWith("Video Screen")) continue;
                if (!renderer.sharedMaterial.HasProperty(EmissionId)) continue;
                leds.Add(new Led(renderer, bar, leds.Count));
            }
        }

        private void Update()
        {
            float beat = ClubBeatClock.Beat;
            foreach (Led led in leds)
            {
                if (led.Renderer == null) continue;
                float phase = led.Index * 0.47f;
                float chase = Mathf.Pow(0.5f + 0.5f * Mathf.Sin(beat * 1.8f - phase), 3f);
                float level = ClubAudioReactive.Playing
                    ? 0.12f + ClubAudioReactive.Band(led.Index) * 0.88f
                    : 0.2f + 0.45f * (0.5f + 0.5f * Mathf.Sin(beat * 2.2f + phase));
                Color color = Color.HSVToRGB(Mathf.Repeat(beat * 0.018f + led.Index * 0.024f, 1f), 0.85f, 1f);
                block.Clear();
                block.SetColor(ColorId, color * 0.25f);
                block.SetColor(EmissionId, color * (0.25f + chase * 0.6f + ClubAudioReactive.Energy * 0.8f + ClubAudioReactive.Pulse * 2.2f + ClubGiftShow.Accent));
                led.Renderer.SetPropertyBlock(block);
                if (!led.Bar) continue;
                Transform target = led.Renderer.transform;
                float height = led.Scale.y * level;
                target.localScale = new Vector3(led.Scale.x, height, led.Scale.z);
                target.localPosition = led.Position + Vector3.up * ((height - led.Scale.y) * 0.5f);
            }
        }

        private sealed class Led
        {
            public readonly Renderer Renderer;
            public readonly bool Bar;
            public readonly int Index;
            public readonly Vector3 Scale;
            public readonly Vector3 Position;
            public Led(Renderer renderer, bool bar, int index)
            {
                Renderer = renderer;
                Bar = bar;
                Index = index;
                Scale = renderer.transform.localScale;
                Position = renderer.transform.localPosition;
            }
        }
    }
}
