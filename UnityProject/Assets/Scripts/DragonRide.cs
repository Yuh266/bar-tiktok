using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace TikTokLiveGame
{
    public sealed class DragonRide : MonoBehaviour
    {
        private const float TakeoffSeconds = 0.6f;
        private float orbitSeconds = 3.8f;
        private const float LandingSeconds = 0.6f;
        private readonly Queue<RideRequest> waiting = new();
        private readonly List<Material> materials = new();
        private Transform dragon, leftWing, rightWing;
        private readonly Transform[] tail = new Transform[8];
        private PlayerActor rider;
        private ClubCameraController flightCamera;
        private Mesh coneMesh, wingMesh;
        private Material jade, darkJade, gold, membrane, saddle, eyes, pupil;
        private Vector3 departure;
        private float startedAt, startAngle;
        public bool IsActive => dragon != null;
        public int WaitingCount => waiting.Count;
        public PlayerActor Rider => rider;

        private void Awake()
        {
            jade = ColorMaterial(new Color(0.09f, 0.72f, 0.52f), 0.3f);
            darkJade = ColorMaterial(new Color(0.025f, 0.27f, 0.24f), 0.2f);
            gold = ColorMaterial(new Color(1f, 0.66f, 0.12f), 0.7f);
            membrane = ColorMaterial(new Color(0.55f, 0.14f, 0.79f), 0.45f);
            saddle = ColorMaterial(new Color(0.5f, 0.07f, 0.17f), 0.3f);
            eyes = ColorMaterial(new Color(1f, 0.95f, 0.56f), 0.8f);
            pupil = ColorMaterial(new Color(0.012f, 0.018f, 0.03f), 0f);
            coneMesh = MakeCone();
            wingMesh = MakeWing();
        }

        private Material ColorMaterial(Color color, float glow)
        {
            Material material = GameMaterials.Lit(color, 0.25f, 0.65f, color * glow);
            materials.Add(material);
            return material;
        }

        public bool RequestRide(PlayerActor actor, float seconds = 5f)
        {
            if (actor == null || actor.IsNpc || actor.IsGuestDj || !isActiveAndEnabled) return false;
            if (actor == rider) return true;
            foreach (RideRequest request in waiting) if (request.Actor == actor) return true;
            if (waiting.Count >= 8) return false;
            waiting.Enqueue(new RideRequest(actor, Mathf.Clamp(seconds, 5f, 300f)));
            return true;
        }

        private void Update()
        {
            if (dragon == null)
            {
                DuckParade parade = FindFirstObjectByType<DuckParade>();
                if (parade != null && parade.ActiveDuckCount > 0) return;
                while (waiting.Count > 0)
                {
                    RideRequest request = waiting.Dequeue();
                    PlayerActor next = request.Actor;
                    if (next == null || next.IsNpc || next.IsGuestDj || next.IsInParade) continue;
                    if (next.BeginDragonRide()) { StartRide(next, request.Seconds); break; }
                }
                return;
            }
            if (rider == null || !rider.IsDragonRiding || rider.IsGuestDj) { FinishRide(); return; }
            float elapsed = Time.unscaledTime - startedAt;
            if (elapsed >= TakeoffSeconds + orbitSeconds + LandingSeconds) { FinishRide(); return; }
            Vector3 position;
            Vector3 forward;
            if (elapsed < TakeoffSeconds)
            {
                position = Vector3.Lerp(departure, Orbit(0f), Smooth(elapsed / TakeoffSeconds));
                forward = Orbit(0.015f) - Orbit(0f);
            }
            else if (elapsed < TakeoffSeconds + orbitSeconds)
            {
                float progress = (elapsed - TakeoffSeconds) / orbitSeconds;
                position = Orbit(progress);
                forward = Orbit(progress + 0.015f) - position;
            }
            else
            {
                float progress = (elapsed - TakeoffSeconds - orbitSeconds) / LandingSeconds;
                position = Vector3.Lerp(Orbit(1f), rider.AssignedHome, Smooth(progress));
                forward = Orbit(1.015f) - Orbit(1f);
            }
            dragon.position = position;
            forward.y = 0f;
            float bank = Mathf.Sin(elapsed * 2.2f) * 9f;
            dragon.rotation = Quaternion.Slerp(dragon.rotation, Quaternion.LookRotation(forward) * Quaternion.Euler(0f, 0f, bank), 1f - Mathf.Exp(-14f * Time.unscaledDeltaTime));
            float appear = Smooth(Mathf.Clamp01(elapsed / TakeoffSeconds));
            float disappear = Smooth(Mathf.Clamp01((TakeoffSeconds + orbitSeconds + LandingSeconds - elapsed) / LandingSeconds));
            dragon.localScale = Vector3.one * (0.95f * appear * disappear);
            float flap = Mathf.Sin(elapsed * 9.5f) * 32f + 8f;
            leftWing.localRotation = Quaternion.Euler(0f, 0f, -flap);
            rightWing.localRotation = Quaternion.Euler(0f, 0f, flap);
            for (int index = 0; index < tail.Length; index++)
                tail[index].localPosition = new Vector3(Mathf.Sin(elapsed * 3f - index * 0.55f) * (0.05f + index * 0.025f),
                    0.12f + Mathf.Sin(elapsed * 2f - index * 0.4f) * 0.08f, -1.1f - index * 0.34f);
            rider.FollowDragon(dragon.TransformPoint(new Vector3(0f, 0.69f, -0.2f)));
        }

        private static float Smooth(float value) => value * value * (3f - 2f * value);
        private Vector3 Orbit(float progress)
        {
            float angle = startAngle + progress * Mathf.PI * 2f;
            return new Vector3(Mathf.Sin(angle) * 4.4f, 4.3f + Mathf.Sin(angle * 2f) * 0.65f, Mathf.Cos(angle) * 3f - 0.3f);
        }

        private void StartRide(PlayerActor actor, float seconds)
        {
            orbitSeconds = seconds - TakeoffSeconds - LandingSeconds;
            rider = actor;
            departure = actor.transform.position;
            startAngle = Mathf.Atan2(departure.x / 4.4f, (departure.z + 0.3f) / 3f);
            startedAt = Time.unscaledTime;
            BuildDragon();
            dragon.position = departure;
            dragon.localScale = Vector3.zero;
            flightCamera = Camera.main != null ? Camera.main.GetComponent<ClubCameraController>() : null;
            if (flightCamera != null) flightCamera.BeginDragonFlight(dragon);
            Debug.Log($"DRAGON_RIDE started rider={actor.UserId} duration={seconds:F0}s");
        }

        private void FinishRide()
        {
            if (rider != null) rider.EndDragonRide();
            rider = null;
            if (dragon != null) Destroy(dragon.gameObject);
            dragon = null;
            if (flightCamera != null) flightCamera.EndDragonFlight();
            flightCamera = null;
            Debug.Log("DRAGON_RIDE ended");
        }

        private void BuildDragon()
        {
            dragon = new GameObject("Jade Flying Dragon").transform;
            dragon.SetParent(transform, false);
            Part(dragon, "Body", new Vector3(0f, 0.14f, -0.1f), new Vector3(1f, 0.79f, 2.2f), jade);
            Part(dragon, "Golden belly", new Vector3(0f, -0.15f, 0.2f), new Vector3(0.76f, 0.42f, 1.7f), gold);
            Part(dragon, "Chest", new Vector3(0f, 0.25f, 0.72f), new Vector3(0.8f, 0.83f, 0.85f), jade);
            Part(dragon, "Neck", new Vector3(0f, 0.62f, 1.03f), new Vector3(0.61f, 0.9f, 0.72f), jade);
            Part(dragon, "Head", new Vector3(0f, 1f, 1.49f), new Vector3(0.84f, 0.7f, 1.05f), jade);
            Part(dragon, "Muzzle", new Vector3(0f, 0.84f, 2.02f), new Vector3(0.65f, 0.4f, 0.88f), jade);
            Part(dragon, "Lower jaw", new Vector3(0f, 0.63f, 1.99f), new Vector3(0.63f, 0.16f, 0.73f), gold);
            Part(dragon, "Riding saddle", new Vector3(0f, 0.57f, -0.2f), new Vector3(0.75f, 0.2f, 0.72f), saddle);
            Part(dragon, "Saddle gold trim", new Vector3(0f, 0.51f, -0.2f), new Vector3(0.82f, 0.1f, 0.8f), gold);
            for (int side = -1; side <= 1; side += 2)
            {
                Part(dragon, "Eye", new Vector3(side * 0.35f, 1.1f, 1.68f), new Vector3(0.17f, 0.23f, 0.27f), eyes);
                Part(dragon, "Pupil", new Vector3(side * 0.419f, 1.11f, 1.75f), new Vector3(0.044f, 0.16f, 0.1f), pupil);
                Part(dragon, "Nostril", new Vector3(side * 0.16f, 0.97f, 2.32f), new Vector3(0.1f, 0.055f, 0.1f), pupil);
                Horn(dragon, "Curved golden horn", new Vector3(side * 0.27f, 1.27f, 1.13f), new Vector3(side * 0.48f, 1.96f, 0.88f), 0.16f, gold);
                Horn(dragon, "Ear fin", new Vector3(side * 0.34f, 1f, 1.22f), new Vector3(side * 0.76f, 1.25f, 0.87f), 0.22f, darkJade);
                Horn(dragon, "Tooth", new Vector3(side * 0.24f, 0.77f, 2.14f), new Vector3(side * 0.24f, 0.6f, 2.14f), 0.055f, eyes);
                for (int leg = -1; leg <= 1; leg += 2)
                {
                    Part(dragon, "Leg", new Vector3(side * 0.49f, -0.25f, leg * 0.58f), new Vector3(0.31f, 0.68f, 0.4f), jade);
                    Part(dragon, "Foot", new Vector3(side * 0.5f, -0.55f, leg * 0.58f + 0.13f), new Vector3(0.34f, 0.18f, 0.52f), darkJade);
                    for (int claw = -1; claw <= 1; claw++)
                        Horn(dragon, "Gold claw", new Vector3(side * 0.5f + claw * 0.09f, -0.54f, leg * 0.58f + 0.31f),
                            new Vector3(side * 0.5f + claw * 0.1f, -0.56f, leg * 0.58f + 0.53f), 0.045f, gold);
                }
                Transform wing = new GameObject(side < 0 ? "Left wing" : "Right wing").transform;
                wing.SetParent(dragon, false); wing.localPosition = new Vector3(side * 0.36f, 0.42f, 0.2f);
                wing.localScale = new Vector3(side, 1f, 1f);
                MeshPart(wing, "Violet wing membrane", wingMesh, membrane);
                foreach (Vector3 tip in new[] { new Vector3(2.45f, 0f, 0.65f), new Vector3(3f, 0f, -0.25f), new Vector3(1.72f, 0f, -1.15f) })
                    Bone(wing, Vector3.zero, tip, 0.045f, gold);
                if (side < 0) leftWing = wing; else rightWing = wing;
            }
            for (int index = 0; index < tail.Length; index++)
            {
                tail[index] = new GameObject($"Tail segment {index}").transform;
                tail[index].SetParent(dragon, false);
                float width = Mathf.Lerp(0.59f, 0.11f, index / 7f);
                Part(tail[index], "Tail scale", Vector3.zero, new Vector3(width, width * 0.75f, 0.65f), jade);
                Horn(tail[index], "Tail spine", new Vector3(0f, width * 0.25f, 0f), new Vector3(0f, width * 0.25f + 0.27f, -0.12f), width * 0.17f, gold);
            }
            for (int index = 0; index < 3; index++)
                Horn(dragon, "Neck spine", new Vector3(0f, 0.66f + index * 0.18f, 0.62f + index * 0.22f),
                    new Vector3(0f, 1f + index * 0.18f, 0.5f + index * 0.22f), 0.13f, gold);
            GameObject glow = new("Dragon warm glow"); glow.transform.SetParent(dragon, false);
            Light light = glow.AddComponent<Light>(); light.color = new Color(0.35f, 1f, 0.7f); light.intensity = 2.5f; light.range = 7f;
        }

        private static Transform Part(Transform parent, string name, Vector3 position, Vector3 scale, Material material)
        {
            GameObject part = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            part.name = name; part.transform.SetParent(parent, false);
            part.transform.localPosition = position; part.transform.localScale = scale;
            Collider collider = part.GetComponent<Collider>(); collider.enabled = false; Destroy(collider);
            Renderer renderer = part.GetComponent<Renderer>(); renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.Off; renderer.receiveShadows = false;
            return part.transform;
        }

        private static Transform MeshPart(Transform parent, string name, Mesh mesh, Material material)
        {
            GameObject part = new(name); part.transform.SetParent(parent, false);
            part.AddComponent<MeshFilter>().sharedMesh = mesh;
            MeshRenderer renderer = part.AddComponent<MeshRenderer>(); renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.Off; renderer.receiveShadows = false;
            return part.transform;
        }

        private void Horn(Transform parent, string name, Vector3 from, Vector3 to, float radius, Material material)
        {
            Transform horn = MeshPart(parent, name, coneMesh, material);
            horn.localPosition = from;
            horn.localRotation = Quaternion.FromToRotation(Vector3.up, to - from);
            horn.localScale = new Vector3(radius, Vector3.Distance(from, to), radius);
        }

        private static void Bone(Transform parent, Vector3 from, Vector3 to, float radius, Material material)
        {
            Transform bone = Part(parent, "Wing finger", (from + to) * 0.5f, new Vector3(radius * 2f, Vector3.Distance(from, to), radius * 2f), material);
            bone.localRotation = Quaternion.FromToRotation(Vector3.up, to - from);
        }

        private static Mesh MakeCone()
        {
            const int count = 12;
            Vector3[] vertices = new Vector3[count + 2];
            vertices[count] = Vector3.up;
            int[] triangles = new int[count * 6];
            for (int index = 0; index < count; index++)
            {
                float angle = index * Mathf.PI * 2f / count;
                vertices[index] = new Vector3(Mathf.Cos(angle), 0f, Mathf.Sin(angle));
                int next = (index + 1) % count;
                triangles[index * 6] = index; triangles[index * 6 + 1] = count; triangles[index * 6 + 2] = next;
                triangles[index * 6 + 3] = next; triangles[index * 6 + 4] = count + 1; triangles[index * 6 + 5] = index;
            }
            Mesh mesh = new() { name = "Dragon horn mesh", vertices = vertices, triangles = triangles };
            mesh.RecalculateNormals(); return mesh;
        }

        private static Mesh MakeWing()
        {
            Vector3[] front = { Vector3.zero, new(0.5f, 0f, 0.7f), new(2.45f, 0f, 0.65f), new(3f, 0f, -0.25f),
                new(2.15f, 0f, -0.65f), new(1.72f, 0f, -1.15f), new(0.85f, 0f, -1.3f), new(0.12f, 0f, -0.65f) };
            Vector3[] vertices = new Vector3[front.Length * 2];
            front.CopyTo(vertices, 0); front.CopyTo(vertices, front.Length);
            List<int> triangles = new();
            for (int index = 1; index < front.Length - 1; index++)
            {
                triangles.AddRange(new[] { 0, index, index + 1, front.Length, front.Length + index + 1, front.Length + index });
            }
            Mesh mesh = new() { name = "Dragon double-sided wing", vertices = vertices, triangles = triangles.ToArray() };
            mesh.RecalculateNormals(); return mesh;
        }

        private void OnDisable() { waiting.Clear(); if (dragon != null || rider != null) FinishRide(); }
        private readonly struct RideRequest
        {
            public PlayerActor Actor { get; }
            public float Seconds { get; }
            public RideRequest(PlayerActor actor, float seconds) { Actor = actor; Seconds = seconds; }
        }
        private void OnDestroy()
        {
            foreach (Material material in materials) Destroy(material);
            Destroy(coneMesh); Destroy(wingMesh);
        }
    }
}
