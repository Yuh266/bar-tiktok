using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace TikTokLiveGame
{
    public sealed class DuckParade : MonoBehaviour
    {
        private const float MinBreak = 45f;
        private const float MaxBreak = 90f;
        private const float CrossingSeconds = 6f;
        private const float FollowSpacing = 1.65f;
        private const int RouteSamples = 128;
        private const float RouteCenterZ = 7.4f;
        private const float RouteHalfDepth = 1.8f;
        private readonly List<PlayerActor> participants = new();
        private readonly Vector3[] routePoints = new Vector3[RouteSamples + 1];
        private readonly float[] routeDistances = new float[RouteSamples + 1];
        private PlayerManager playerManager;
        private ClubCameraController paradeCamera;
        private float routeLength;
        private Transform flock;
        private Transform[] ducks;
        private Transform[] leftFeet;
        private Transform[] rightFeet;
        private Material yellow;
        private Material orange;
        private Material wingYellow;
        private Material black;
        private Material white;
        private AudioSource audioSource;
        private AudioClip quack;
        private float nextAt;
        private float startedAt;
        private float nextQuackAt;
        private float duration;

        public int ActiveDuckCount => flock == null ? 0 : ducks.Length;
        public int ActiveViewerCount => participants.Count;

        private void Awake()
        {
            yellow = GameMaterials.Club(new Color(1f, 0.81f, 0.08f), new Color(0.52f, 0.31f, 0.015f));
            orange = GameMaterials.Club(new Color(1f, 0.32f, 0.025f), new Color(0.28f, 0.045f, 0f));
            wingYellow = GameMaterials.Club(new Color(1f, 0.64f, 0.025f), new Color(0.35f, 0.16f, 0f));
            black = GameMaterials.Club(new Color(0.012f, 0.009f, 0.006f), Color.black);
            white = GameMaterials.Club(Color.white, Color.white * 0.2f);
            audioSource = gameObject.AddComponent<AudioSource>();
            audioSource.playOnAwake = false;
            audioSource.volume = 0.14f;
            audioSource.spatialBlend = 0f;
            quack = CreateQuack();
            nextAt = Time.unscaledTime + (Array.IndexOf(Environment.GetCommandLineArgs(), "-duckPreview") >= 0
                ? 0.5f : UnityEngine.Random.Range(20f, 35f));
        }

        private void Update()
        {
            if (flock == null)
            {
                if (Time.unscaledTime >= nextAt) StartParade();
                return;
            }
            participants.RemoveAll(actor => actor == null || !actor.IsInParade || actor.IsGuestDj);
            float elapsed = Time.unscaledTime - startedAt;
            if (elapsed >= duration || participants.Count == 0)
            {
                FinishParade();
                return;
            }
            if (Time.unscaledTime >= nextQuackAt && elapsed < 10f)
            {
                audioSource.PlayOneShot(quack);
                nextQuackAt = Time.unscaledTime + 4.5f;
            }
            for (int index = 0; index < ducks.Length; index++)
            {
                int slot = index == 0 ? 0 : participants.Count + 1;
                float distance = elapsed / CrossingSeconds * routeLength - slot * FollowSpacing;
                Vector3 position = Route(distance);
                Vector3 forward = Route(distance + 0.05f) - position;
                float step = elapsed * 13f - index * 0.8f;
                ducks[index].gameObject.SetActive(true);
                ducks[index].position = position + Vector3.up * (0.04f + Mathf.Abs(Mathf.Sin(step)) * 0.055f);
                ducks[index].rotation = Quaternion.LookRotation(forward) * Quaternion.Euler(0f, 0f, Mathf.Sin(step) * 7f);
                leftFeet[index].localRotation = Quaternion.Euler(Mathf.Sin(step) * 26f, 0f, 0f);
                rightFeet[index].localRotation = Quaternion.Euler(-Mathf.Sin(step) * 26f, 0f, 0f);
            }
            for (int index = 0; index < participants.Count; index++)
                participants[index].FollowParade(Route(elapsed / CrossingSeconds * routeLength - (index + 1) * FollowSpacing));
            if (paradeCamera != null)
            {
                Bounds bounds = new(ducks[0].position + Vector3.up * 1.25f, Vector3.zero);
                bounds.Encapsulate(ducks[1].position + Vector3.up * 1.25f);
                for (int index = 0; index < participants.Count; index++)
                    bounds.Encapsulate(Route(elapsed / CrossingSeconds * routeLength - (index + 1) * FollowSpacing) + Vector3.up * 1.25f);
                bounds.Expand(new Vector3(2f, 3.6f, 2f));
                paradeCamera.UpdateParadeBounds(bounds);
            }
        }

        private void BuildRoute()
        {
            float direction = UnityEngine.Random.value < 0.5f ? -1f : 1f;
            float start = UnityEngine.Random.Range(0f, Mathf.PI * 2f);
            routeDistances[0] = 0f;
            for (int index = 0; index <= RouteSamples; index++)
            {
                float angle = start + direction * index / RouteSamples * Mathf.PI * 2f;
                routePoints[index] = new Vector3(Mathf.Sin(angle) * 5.5f, 0f, RouteCenterZ + Mathf.Cos(angle) * RouteHalfDepth);
                if (index > 0) routeDistances[index] = routeDistances[index - 1] + Vector3.Distance(routePoints[index - 1], routePoints[index]);
            }
            routeLength = routeDistances[RouteSamples];
        }

        private Vector3 Route(float distance)
        {
            float wrapped = Mathf.Repeat(distance, routeLength);
            int upper = Array.BinarySearch(routeDistances, wrapped);
            if (upper < 0) upper = ~upper;
            upper = Mathf.Clamp(upper, 1, RouteSamples);
            float progress = Mathf.InverseLerp(routeDistances[upper - 1], routeDistances[upper], wrapped);
            return Vector3.Lerp(routePoints[upper - 1], routePoints[upper], progress);
        }

        private void StartParade()
        {
            if (flock != null) return;
            DragonRide flight = FindFirstObjectByType<DragonRide>();
            if (flight != null && flight.IsActive) { nextAt = Time.unscaledTime + 10f; return; }
            if (playerManager == null) playerManager = FindFirstObjectByType<PlayerManager>();
            PlayerActor[] selected = playerManager == null ? Array.Empty<PlayerActor>() : playerManager.PickParadeViewers();
            if (selected.Length == 0) { nextAt = Time.unscaledTime + 10f; return; }
            participants.AddRange(selected);
            foreach (PlayerActor actor in participants) actor.BeginParade();
            BuildRoute();
            flock = new GameObject("Random Duck Parade").transform;
            flock.SetParent(transform, false);
            ducks = new Transform[2]; leftFeet = new Transform[2]; rightFeet = new Transform[2];
            for (int index = 0; index < ducks.Length; index++) BuildDuck(index);
            startedAt = Time.unscaledTime;
            duration = CrossingSeconds;
            nextQuackAt = startedAt;
            paradeCamera = Camera.main?.GetComponent<ClubCameraController>();
            paradeCamera?.BeginParade(new Bounds(new Vector3(0f, 1.2f, RouteCenterZ), new Vector3(12.8f, 4f, 5.2f)));
            Debug.Log($"DUCK_PARADE started ducks=2 viewers={participants.Count} duration={duration:F1}s");
        }

        private void FinishParade()
        {
            foreach (PlayerActor actor in participants) if (actor != null) actor.EndParade();
            participants.Clear();
            if (flock != null) Destroy(flock.gameObject);
            flock = null;
            if (paradeCamera != null) paradeCamera.EndParade();
            paradeCamera = null;
            float pause = UnityEngine.Random.Range(MinBreak, MaxBreak);
            nextAt = Time.unscaledTime + pause;
            Debug.Log($"DUCK_PARADE ended nextIn={pause:F1}s active=0");
        }

        private void BuildDuck(int index)
        {
            Transform duck = new GameObject($"Parade Duck {index + 1}").transform;
            duck.SetParent(flock, false);
            duck.localScale = Vector3.one * (index == 0 ? 0.86f : 0.8f);
            ducks[index] = duck;
            Part(duck, "Body", new Vector3(0f, 0.37f, -0.04f), new Vector3(0.67f, 0.54f, 0.86f), yellow);
            Part(duck, "Head", new Vector3(0f, 0.81f, 0.28f), Vector3.one * 0.49f, yellow);
            Part(duck, "Bill", new Vector3(0f, 0.74f, 0.56f), new Vector3(0.35f, 0.13f, 0.31f), orange);
            Part(duck, "Tail", new Vector3(0f, 0.47f, -0.43f), new Vector3(0.27f, 0.28f, 0.32f), yellow);
            for (int side = -1; side <= 1; side += 2)
            {
                Part(duck, "Eye", new Vector3(side * 0.19f, 0.88f, 0.40f), Vector3.one * 0.085f, black);
                Part(duck, "Eye Glint", new Vector3(side * 0.211f, 0.895f, 0.425f), Vector3.one * 0.027f, white);
                Part(duck, "Wing", new Vector3(side * 0.31f, 0.43f, -0.09f), new Vector3(0.13f, 0.28f, 0.45f), wingYellow);
            }
            leftFeet[index] = Part(duck, "Left Foot", new Vector3(-0.17f, 0.05f, 0.07f), new Vector3(0.18f, 0.075f, 0.31f), orange);
            rightFeet[index] = Part(duck, "Right Foot", new Vector3(0.17f, 0.05f, 0.07f), new Vector3(0.18f, 0.075f, 0.31f), orange);
            duck.gameObject.SetActive(false);
        }

        private static Transform Part(Transform parent, string name, Vector3 position, Vector3 scale, Material material)
        {
            GameObject part = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            part.name = name;
            part.transform.SetParent(parent, false);
            part.transform.localPosition = position;
            part.transform.localScale = scale;
            Collider collider = part.GetComponent<Collider>();
            collider.enabled = false;
            Destroy(collider);
            Renderer renderer = part.GetComponent<Renderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            return part.transform;
        }

        private static AudioClip CreateQuack()
        {
            const int rate = 16000;
            float[] samples = new float[5600];
            float phase = 0f;
            for (int index = 0; index < samples.Length; index++)
            {
                float t = (float)index / rate;
                float envelope = Mathf.Clamp01(t / 0.025f) * Mathf.Clamp01((0.35f - t) / 0.16f);
                phase += 2f * Mathf.PI * Mathf.Lerp(620f, 390f, t / 0.35f) / rate;
                samples[index] = (Mathf.Sin(phase) + 0.45f * Mathf.Sin(phase * 3f) + 0.2f * Mathf.Sin(phase * 5f))
                    * envelope * (0.6f + 0.4f * Mathf.Sin(t * 105f)) * 0.32f;
            }
            AudioClip clip = AudioClip.Create("Duck Parade Quack", samples.Length, 1, rate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        private void OnDisable()
        {
            FinishParade();
            if (audioSource != null) audioSource.Stop();
        }

        private void OnDestroy()
        {
            Destroy(yellow); Destroy(orange); Destroy(wingYellow); Destroy(black); Destroy(white); Destroy(quack);
        }
    }
}
