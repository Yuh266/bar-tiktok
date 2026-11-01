using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace TikTokLiveGame
{
    // Batched inlaid geometry keeps the floor crisp without a screen-sized bloom effect.
    public sealed class NeonDanceFloor : MonoBehaviour
    {
        private Material cyan, violet, pearl;
        private Color mainColor, accentColor, indexColor;
        private static NeonDanceFloor current;
        private static string currentTheme;
        private static float partyUntil;
        private static readonly Color Cyan = new(0.025f, 0.66f, 0.86f);
        private static readonly Color Violet = new(0.36f, 0.09f, 0.72f);
        private static readonly Color Pearl = new(0.3f, 0.67f, 0.75f);
        private static readonly int Emission = Shader.PropertyToID("_EmissionColor");

        public static void ApplyTheme(string theme)
        {
            if (theme is not ("neon" or "disco" or "lava") || theme == currentTheme) return;
            int layer = current == null ? 8 : current.gameObject.layer;
            if (current != null) { current.gameObject.SetActive(false); Destroy(current.gameObject); }
            Build(layer, theme);
        }

        public static void Party(float seconds) => partyUntil = Mathf.Max(partyUntil, Time.unscaledTime + seconds);

        public static void Build(int layer, string theme = "neon")
        {
            GameObject root = new("Neon Hex Dance Floor");
            root.layer = layer;
            NeonDanceFloor show = root.AddComponent<NeonDanceFloor>();
            current = show;
            currentTheme = theme;
            show.mainColor = theme == "lava" ? new Color(1f, 0.25f, 0.015f) : theme == "disco" ? new Color(0.95f, 0.08f, 0.5f) : Cyan;
            show.accentColor = theme == "lava" ? new Color(0.9f, 0.035f, 0.01f) : theme == "disco" ? new Color(0.12f, 0.48f, 0.95f) : Violet;
            show.indexColor = theme == "lava" ? new Color(1f, 0.65f, 0.15f) : Pearl;
            show.cyan = GameMaterials.Club(Color.black, show.mainColor);
            show.violet = GameMaterials.Club(Color.black, show.accentColor);
            show.pearl = GameMaterials.Club(Color.black, show.indexColor);

            GameObject deck = GameObject.CreatePrimitive(PrimitiveType.Plane);
            deck.name = "Graphite Dance Deck";
            deck.layer = layer;
            deck.transform.SetParent(root.transform);
            deck.transform.position = new Vector3(0f, -0.05f, -3f);
            deck.transform.localScale = new Vector3(1.8f, 1f, 2.8f);
            deck.GetComponent<Renderer>().sharedMaterial = GameMaterials.Club(new Color(0.009f, 0.018f, 0.033f), Color.black);

            Surface cyanLines = new(), violetLines = new(), fineLines = new(), halos = new(), panels = new();
            const float radius = 0.69f;
            float spacing = Mathf.Sqrt(3f) * radius;
            Vector2 center = new(0f, 1.2f);
            for (int row = -17; row <= 10; row++)
            for (int column = -8; column <= 8; column++)
            {
                Vector2 point = new((column + (Mathf.Abs(row) % 2) * 0.5f) * spacing, row * radius * 1.5f);
                if (Mathf.Abs(point.x) + spacing * 0.5f > 8.7f || point.y - radius < -16.7f || point.y + radius > 10.7f) continue;
                // Leave an uninterrupted graphite inset for the circular centerpiece.
                if (Vector2.Distance(point, center) < 3.65f) continue;
                if (theme == "disco") continue;
                Surface lines = (column + row * 2) % 5 == 0 ? violetLines : cyanLines;
                float panelRadius = theme == "lava" ? radius * (0.79f + 0.12f * Mathf.Abs(Mathf.Sin(column * 7.3f + row * 2.7f))) : radius * 0.94f;
                panels.Polygon(point, panelRadius, 6, 30f, -0.044f);
                for (int side = 0; side < 6; side++)
                {
                    Vector2 a = point + Direction(30f + side * 60f) * radius * 0.97f;
                    Vector2 b = point + Direction(30f + (side + 1) * 60f) * radius * 0.97f;
                    lines.Line(a, b, theme == "lava" ? 0.052f : 0.024f, -0.03f);
                    halos.Line(a, b, theme == "lava" ? 0.18f : 0.082f, -0.038f);
                    if (theme == "lava" && side % 2 == 0)
                        lines.Line(point + Direction(side * 60f) * 0.18f, a, 0.024f, -0.032f);
                }
            }
            if (theme == "disco")
            {
                for (int z = -16; z <= 9; z++)
                for (int x = -8; x <= 7; x++)
                {
                    Vector2 point = new(x + 0.5f, z + 0.5f);
                    if (Vector2.Distance(point, center) < 3.7f) continue;
                    Surface lines = (x + z) % 2 == 0 ? cyanLines : violetLines;
                    panels.Polygon(point, 0.65f, 4, 45f, -0.044f);
                    for (int side = 0; side < 4; side++)
                    {
                        Vector2 a = point + Direction(45f + side * 90f) * 0.68f;
                        Vector2 b = point + Direction(45f + (side + 1) * 90f) * 0.68f;
                        lines.Line(a, b, 0.065f, -0.03f);
                        halos.Line(a, b, 0.16f, -0.038f);
                    }
                }
            }

            // Three concentric inlays and radial index marks form the dance circle.
            panels.Polygon(center, 2.94f, 96, 0f, -0.044f);
            cyanLines.Arc(center, 3.08f, 0.034f, 0f, 360f, -0.024f);
            violetLines.Arc(center, 3.3f, 0.065f, 0f, 360f, -0.025f);
            fineLines.Arc(center, 2.97f, 0.012f, 0f, 360f, -0.024f);
            halos.Arc(center, 3.08f, 0.13f, 0f, 360f, -0.036f);
            for (int index = 0; index < 48; index++)
            {
                float angle = index * 7.5f;
                Vector2 direction = Direction(angle);
                fineLines.Line(center + direction * 3.38f, center + direction * (index % 4 == 0 ? 3.57f : 3.47f), 0.024f, -0.024f);
            }
            for (int index = 0; index < 3; index++)
                cyanLines.Arc(center, 2.66f, 0.048f, 12f + index * 120f, 68f + index * 120f, -0.024f);

            // Recessed perimeter runners taper toward the DJ booth.
            foreach (float x in new[] { -8.88f, 8.88f })
            {
                cyanLines.Line(new Vector2(x, -16.8f), new Vector2(x, 10.8f), 0.045f, -0.02f);
                violetLines.Line(new Vector2(x * 0.966f, -16.8f), new Vector2(x * 0.966f, 10.8f), 0.018f, -0.02f);
                for (int z = -16; z <= 10; z += 2)
                    fineLines.Line(new Vector2(x, z), new Vector2(x * 0.94f, z), 0.045f, -0.02f);
            }
            cyanLines.Line(new Vector2(-8.88f, 10.8f), new Vector2(8.88f, 10.8f), 0.05f, -0.02f);
            violetLines.Line(new Vector2(-8.58f, 10.5f), new Vector2(8.58f, 10.5f), 0.022f, -0.02f);

            panels.Create(root, "Smoked Glass Hex Panels", GameMaterials.Club(new Color(0.016f, 0.031f, 0.052f), Color.black));
            halos.Create(root, "Recessed Neon Halos", GameMaterials.Club(Color.black, show.mainColor * (theme == "lava" ? 0.22f : 0.12f)));
            cyanLines.Create(root, "Cyan Hex Inlays", show.cyan);
            violetLines.Create(root, "Violet Accent Inlays", show.violet);
            fineLines.Create(root, "Pearl Dial Indices", show.pearl);
        }

        private void Update()
        {
            float breath = 0.78f + 0.1f * Mathf.Sin(ClubBeatClock.Beat * 0.45f);
            float music = ClubAudioReactive.Energy * 0.14f + ClubAudioReactive.Pulse * 0.2f;
            float party = Time.unscaledTime < partyUntil ? 0.2f + 0.15f * Mathf.Sin(ClubBeatClock.Beat * 1.5f) : 0f;
            cyan.SetColor(Emission, mainColor * (breath + music + party));
            violet.SetColor(Emission, accentColor * (0.85f + music + party));
            pearl.SetColor(Emission, indexColor * (0.65f + music * 0.5f));
        }

        private void OnDestroy()
        {
            foreach (MeshFilter filter in GetComponentsInChildren<MeshFilter>())
                if (filter.sharedMesh != null && filter.sharedMesh.name != "Plane") Destroy(filter.sharedMesh);
            foreach (Renderer renderer in GetComponentsInChildren<Renderer>())
                if (renderer.sharedMaterial != null) Destroy(renderer.sharedMaterial);
        }

        private static Vector2 Direction(float degrees)
        {
            float radians = degrees * Mathf.Deg2Rad;
            return new Vector2(Mathf.Cos(radians), Mathf.Sin(radians));
        }

        private sealed class Surface
        {
            private readonly List<Vector3> vertices = new();
            private readonly List<int> triangles = new();

            public void Line(Vector2 a, Vector2 b, float width, float height)
            {
                Vector2 delta = (b - a).normalized;
                Vector2 side = new Vector2(-delta.y, delta.x) * (width * 0.5f);
                int start = vertices.Count;
                Add(a + side, height); Add(b + side, height); Add(b - side, height); Add(a - side, height);
                triangles.AddRange(new[] { start, start + 1, start + 2, start, start + 2, start + 3 });
            }

            public void Polygon(Vector2 center, float radius, int sides, float rotation, float height)
            {
                int start = vertices.Count;
                Add(center, height);
                for (int index = 0; index < sides; index++) Add(center + Direction(rotation - index * 360f / sides) * radius, height);
                for (int index = 0; index < sides; index++)
                    triangles.AddRange(new[] { start, start + 1 + index, start + 1 + (index + 1) % sides });
            }

            public void Arc(Vector2 center, float radius, float width, float from, float to, float height)
            {
                int segments = Mathf.CeilToInt((to - from) / 2f);
                for (int index = 0; index < segments; index++)
                    Line(center + Direction(Mathf.Lerp(from, to, (float)index / segments)) * radius,
                         center + Direction(Mathf.Lerp(from, to, (float)(index + 1) / segments)) * radius, width, height);
            }

            private void Add(Vector2 point, float height) => vertices.Add(new Vector3(point.x, height, point.y));

            public void Create(GameObject parent, string name, Material material)
            {
                GameObject surface = new(name);
                surface.layer = parent.layer;
                surface.transform.SetParent(parent.transform, false);
                Mesh mesh = new() { name = name };
                mesh.SetVertices(vertices);
                mesh.SetTriangles(triangles, 0);
                mesh.RecalculateNormals();
                mesh.RecalculateBounds();
                surface.AddComponent<MeshFilter>().sharedMesh = mesh;
                MeshRenderer renderer = surface.AddComponent<MeshRenderer>();
                renderer.sharedMaterial = material;
                renderer.shadowCastingMode = ShadowCastingMode.Off;
                renderer.receiveShadows = false;
            }
        }
    }
}
