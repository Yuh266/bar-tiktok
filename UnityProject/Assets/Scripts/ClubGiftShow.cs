using System.Collections;
using UnityEngine;

namespace TikTokLiveGame
{
    public sealed class ClubGiftShow : MonoBehaviour
    {
        public static float Accent { get; private set; }
        private Material starMaterial;
        private Material ringMaterial;
        private Material orbitMaterial;
        private int activeShows;
        private float nextShowAt;

        private void Awake()
        {
            Shader shader = Resources.Load<Shader>("Shaders/ClubAdditiveVfx");
            starMaterial = new Material(shader);
            starMaterial.mainTexture = Resources.Load<Texture2D>("Vfx/star_04");
            ringMaterial = new Material(shader);
            ringMaterial.mainTexture = Resources.Load<Texture2D>("Vfx/circle_05");
            orbitMaterial = new Material(shader);
        }

        private void Update() => Accent = Mathf.MoveTowards(Accent, 0f, Time.deltaTime * 0.7f);

        public void Trigger(PlayerActor actor, TikTokEvent gift)
        {
            int tier = gift.diamondCount >= 500 || gift.action == "topdj" ? 2 : gift.diamondCount >= 10 || gift.action == "medal" ? 1 : 0;
            Accent = Mathf.Max(Accent, tier == 2 ? 1.8f : tier == 1 ? 1.1f : 0.45f);
            if (actor == null || activeShows >= 4 || Time.unscaledTime < nextShowAt) return;
            nextShowAt = Time.unscaledTime + 0.25f;
            Color color = tier == 2 ? new Color(1f, 0.72f, 0.12f) : tier == 1 ? new Color(0.85f, 0.15f, 1f) : new Color(0.12f, 0.85f, 1f);
            StartCoroutine(Celebrate(actor, tier, color));
        }

        private IEnumerator Celebrate(PlayerActor actor, int tier, Color color)
        {
            activeShows++;
            GameObject root = new("Gift Energy Show");
            root.transform.position = actor.transform.position;
            GameObject ring = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Destroy(ring.GetComponent<Collider>());
            ring.name = "Expanding Gift Halo";
            ring.transform.SetParent(root.transform, false);
            ring.transform.localPosition = Vector3.up * 0.08f;
            ring.transform.localRotation = Quaternion.Euler(90, 0, 0);
            Renderer ringRenderer = ring.GetComponent<Renderer>();
            ringRenderer.sharedMaterial = ringMaterial;
            MaterialPropertyBlock tint = new();

            GameObject burst = new("Gift Star Shower");
            burst.transform.SetParent(root.transform, false);
            burst.transform.localPosition = Vector3.up * 1.4f;
            ParticleSystem particles = burst.AddComponent<ParticleSystem>();
            particles.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var main = particles.main;
            main.loop = false;
            main.duration = 2f;
            main.startLifetime = new ParticleSystem.MinMaxCurve(0.8f, 1.6f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(0.8f, 2.7f + tier);
            main.startSize = new ParticleSystem.MinMaxCurve(0.07f, 0.14f + tier * 0.04f);
            main.startColor = new ParticleSystem.MinMaxGradient(color, Color.white);
            main.startRotation = new ParticleSystem.MinMaxCurve(0f, Mathf.PI * 2f);
            main.gravityModifier = 0.25f;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            var emission = particles.emission;
            emission.rateOverTime = 0;
            var shape = particles.shape;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = 0.4f;
            var colors = particles.colorOverLifetime;
            colors.enabled = true;
            Gradient gradient = new();
            gradient.SetKeys(new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(color, 1f) }, new[] { new GradientAlphaKey(1f, 0f), new GradientAlphaKey(0f, 1f) });
            colors.color = gradient;
            particles.GetComponent<ParticleSystemRenderer>().sharedMaterial = starMaterial;
            particles.Play();
            particles.Emit(24 + tier * 32);

            LineRenderer orbit = null;
            if (tier > 0)
            {
                GameObject orbitObject = new("VIP Orbit Crown");
                orbitObject.transform.SetParent(root.transform, false);
                orbit = orbitObject.AddComponent<LineRenderer>();
                orbit.useWorldSpace = false;
                orbit.loop = true;
                orbit.positionCount = 64;
                orbit.startWidth = orbit.endWidth = tier == 2 ? 0.045f : 0.025f;
                orbit.sharedMaterial = orbitMaterial;
                orbit.startColor = orbit.endColor = color;
            }

            float duration = tier == 2 ? 4.5f : tier == 1 ? 3f : 1.8f;
            float start = Time.time;
            while (Time.time - start < duration && actor != null)
            {
                float elapsed = Time.time - start;
                root.transform.position = actor.transform.position;
                float size = 0.4f + elapsed * (2f + tier * 0.5f);
                ring.transform.localScale = Vector3.one * size;
                tint.SetColor("_Color", new Color(color.r, color.g, color.b, Mathf.Clamp01(1f - elapsed / 1.5f) * 0.8f));
                ringRenderer.SetPropertyBlock(tint);
                if (orbit != null)
                {
                    for (int i = 0; i < orbit.positionCount; i++)
                    {
                        float angle = i * Mathf.PI * 2f / orbit.positionCount + elapsed * 1.5f;
                        float radius = 0.85f + tier * 0.2f;
                        orbit.SetPosition(i, new Vector3(Mathf.Cos(angle) * radius, 1.3f + Mathf.Sin(angle * 3f + elapsed * 3f) * 0.32f, Mathf.Sin(angle) * radius));
                    }
                }
                yield return null;
            }
            Destroy(root);
            activeShows--;
        }

        private void OnDisable() { Accent = 0f; }
        private void OnDestroy() { Destroy(starMaterial); Destroy(ringMaterial); Destroy(orbitMaterial); }
    }
}
