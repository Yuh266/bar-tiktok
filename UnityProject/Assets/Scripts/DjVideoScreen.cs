using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Video;

namespace TikTokLiveGame
{
    [RequireComponent(typeof(Renderer))]
    public sealed class DjVideoScreen : MonoBehaviour
    {
        private const float ScreenWidth = 6.85f, ScreenHeight = 3.85f;
        private VideoPlayer player;
        private RenderTexture sourceTexture, displayTexture;
        private Material screenMaterial;
        private Texture2D imageTexture;
        private GameObject textScene;
        private Transform movingText;
        private float textWidth, textStartedAt;
        private TikTokWebSocketClient client;
        private DjScreenSettings settings;
        private DjScreenItem[] items = Array.Empty<DjScreenItem>();
        private string[] playlist = Array.Empty<string>();
        private string currentId = "", currentPath = "", fingerprint = "", error = "";
        private int slideIndex, generation;
        private float nextSlideAt = float.PositiveInfinity, nextReportAt;
        private bool connected, showing, loading, configured;

        public void Initialize(TikTokWebSocketClient socketClient) { client = socketClient; client.EventReceived += HandleMessage; }

        private void Awake()
        {
            screenMaterial = new Material(Shader.Find("Unlit/Texture") ?? Shader.Find("Sprites/Default"));
            GetComponent<Renderer>().material = screenMaterial;
            player = gameObject.AddComponent<VideoPlayer>();
            player.playOnAwake = false; player.source = VideoSource.Url; player.renderMode = VideoRenderMode.RenderTexture;
            player.audioOutputMode = VideoAudioOutputMode.None; player.skipOnDrop = true; player.isLooping = true;
            player.aspectRatio = VideoAspectRatio.FitInside;
            player.prepareCompleted += OnVideoPrepared;
            player.errorReceived += OnVideoError;
            SetSolid(new Color(0.015f, 0.03f, 0.07f));
        }

        private void Start()
        {
            if (configured) return;
            items = FindLocalMedia();
            DjScreenItem first = items.FirstOrDefault(item => item.kind == "video") ?? items.FirstOrDefault();
            if (first == null) return;
            settings = new DjScreenSettings { mode = first.kind == "video" ? "single" : "slideshow", selectedId = first.id, slideSeconds = 8f };
            playlist = items.Select(item => item.id).ToArray();
            ShowMedia(first.id);
        }

        private void HandleMessage(TikTokEvent message)
        {
            if (message.type == "screen_config" && message.screenSettings != null)
            {
                DjScreenSettings next = message.screenSettings;
                items = (message.screenItems ?? Array.Empty<DjScreenItem>()).Where(item => item != null &&
                    !string.IsNullOrEmpty(item.id) && !string.IsNullOrEmpty(item.path) && Path.IsPathRooted(item.path) &&
                    (item.kind == "image" || item.kind == "video")).ToArray();
                string nextFingerprint = JsonUtility.ToJson(next);
                bool validCurrent = next.mode == "text" || next.mode == "blank" || items.Any(item => item.id == currentId);
                if (configured && fingerprint == nextFingerprint && validCurrent) return;
                bool sameSingle = next.mode == "single" && settings?.mode == "single" && showing &&
                    string.Equals(items.FirstOrDefault(item => item.id == next.selectedId)?.path, currentPath, StringComparison.OrdinalIgnoreCase);
                settings = next; configured = true; fingerprint = nextFingerprint;
                playlist = (next.playlist ?? Array.Empty<string>()).Where(id => items.Any(item => item.id == id)).Distinct().ToArray();
                slideIndex = 0;
                if (sameSingle) { currentId = next.selectedId; Report(); return; }
                if (next.mode == "text") ShowText();
                else if (next.mode == "single") ShowMedia(next.selectedId);
                else if (next.mode == "slideshow" && playlist.Length > 0) ShowMedia(playlist[0]);
                else { StopCurrent(); SetSolid(Color.black); Report(); }
            }
            else if (message.type == "screen_control" && settings?.mode == "slideshow")
                Advance(message.action == "previous" ? -1 : 1);
        }

        private void Update()
        {
            bool nowConnected = client != null && client.IsConnected;
            if (nowConnected && !connected) client.ScreenReady();
            connected = nowConnected;
            if (connected && Time.unscaledTime >= nextReportAt) Report();
            if (sourceTexture != null && displayTexture != null)
            {
                RenderTexture previous = RenderTexture.active;
                try { Graphics.Blit(sourceTexture, displayTexture, new Vector2(1f, -1f), new Vector2(0f, 1f)); }
                finally { RenderTexture.active = previous; }
            }
            if (movingText != null && settings?.scroll == true)
            {
                float span = ScreenWidth + textWidth + 0.3f;
                float x = ScreenWidth * 0.5f + textWidth * 0.5f - Mathf.Repeat((Time.unscaledTime - textStartedAt) * 0.9f, span);
                movingText.localPosition = new Vector3(-x, 0f, 0f);
            }
            if (settings?.mode == "slideshow" && playlist.Length > 1 && Time.unscaledTime >= nextSlideAt) Advance(1);
        }

        private void Advance(int direction)
        {
            if (playlist.Length <= 1) return;
            slideIndex = (slideIndex + direction + playlist.Length) % playlist.Length;
            ShowMedia(playlist[slideIndex]);
        }

        private void ShowMedia(string id)
        {
            StopCurrent(); currentId = id ?? "";
            DjScreenItem item = items.FirstOrDefault(candidate => candidate.id == id);
            if (item == null) { SetSolid(Color.black); Fail("Chưa chọn được ảnh/video hợp lệ."); return; }
            currentPath = item.path;
            if (item.kind == "video")
            {
                CreateTargets(); loading = true; player.targetTexture = sourceTexture;
                player.url = new Uri(item.path).AbsoluteUri; player.Prepare(); Report();
            }
            else
            {
                try
                {
                    imageTexture = new Texture2D(2, 2, TextureFormat.RGBA32, false) { filterMode = FilterMode.Bilinear, wrapMode = TextureWrapMode.Clamp };
                    if (!imageTexture.LoadImage(File.ReadAllBytes(item.path), false)) throw new IOException();
                    FlipImage(imageTexture); screenMaterial.mainTexture = imageTexture; FitImage(imageTexture);
                    showing = true; SetSlideTimer(); Report(); StartCoroutine(CaptureForVerification(generation));
                }
                catch { Fail("Không đọc được ảnh đã chọn. Vui lòng tải lại ảnh."); }
            }
        }

        private void OnVideoPrepared(VideoPlayer source)
        {
            if (sourceTexture == null || settings?.mode == "text" || settings?.mode == "blank") return;
            loading = false; showing = true; error = ""; source.Play(); SetSlideTimer(); Report(); StartCoroutine(CaptureForVerification(generation));
        }
        private void OnVideoError(VideoPlayer source, string message)
        {
            if (!items.Any(item => item.id == currentId && item.kind == "video")) return;
            Debug.LogWarning($"DJ video: {message}"); Fail("Không phát được video này. Thử MP4 dùng codec H.264.");
        }
        private void SetSlideTimer() { nextSlideAt = settings?.mode == "slideshow" ? Time.unscaledTime + Mathf.Clamp(settings.slideSeconds, 2f, 120f) : float.PositiveInfinity; }
        private void Fail(string message) { loading = false; showing = false; error = message; nextSlideAt = Time.unscaledTime + 2f; Report(); }

        private void CreateTargets()
        {
            sourceTexture = new RenderTexture(1280, 720, 0, RenderTextureFormat.ARGB32) { name = "DJ Screen Source", filterMode = FilterMode.Bilinear };
            displayTexture = new RenderTexture(1280, 720, 0, RenderTextureFormat.ARGB32) { name = "DJ Screen Display", filterMode = FilterMode.Bilinear };
            sourceTexture.Create(); displayTexture.Create(); screenMaterial.mainTexture = displayTexture;
        }

        private void ShowText()
        {
            StopCurrent(); CreateTargets();
            textScene = new GameObject("DJ Text Scene"); textScene.transform.position = new Vector3(1000f, 0f, 0f);
            GameObject cameraObject = new("DJ Text Camera"); cameraObject.transform.SetParent(textScene.transform, false);
            cameraObject.transform.localPosition = new Vector3(0f, 0f, 10f); cameraObject.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            Camera camera = cameraObject.AddComponent<Camera>(); camera.orthographic = true; camera.orthographicSize = ScreenHeight * 0.5f;
            camera.aspect = 16f / 9f; camera.nearClipPlane = 0.1f; camera.farClipPlane = 20f; camera.depth = -10f;
            camera.clearFlags = CameraClearFlags.SolidColor; camera.backgroundColor = ParseColor(settings.background, new Color(0.02f, 0.04f, 0.08f));
            camera.cullingMask = 1 << 30; camera.targetTexture = sourceTexture; camera.allowHDR = false; camera.allowMSAA = false;
            GameObject textObject = new("DJ Custom Text"); textObject.layer = 30; textObject.transform.SetParent(textScene.transform, false);
            textObject.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            TextMesh text = textObject.AddComponent<TextMesh>(); text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.GetComponent<MeshRenderer>().sharedMaterial = text.font.material;
            text.fontSize = 96; text.characterSize = 0.036f * Mathf.Clamp(settings.fontSize, 24, 160) / 64f;
            text.anchor = TextAnchor.MiddleCenter; text.alignment = TextAlignment.Center; text.richText = false;
            text.color = ParseColor(settings.color, Color.yellow);
            text.text = settings.scroll ? (settings.text ?? "").Replace('\n', ' ') : WrapText(settings.text ?? "", 32);
            movingText = settings.scroll ? textObject.transform : null; textStartedAt = Time.unscaledTime;
            showing = true;
            StartCoroutine(FitText(text, generation)); Report(); StartCoroutine(CaptureForVerification(generation));
        }

        private IEnumerator CaptureForVerification(int expectedGeneration)
        {
            string[] arguments = Environment.GetCommandLineArgs();
            int index = Array.IndexOf(arguments, "-screenCaptureDirectory");
            if (index < 0 || index + 1 >= arguments.Length) yield break;
            yield return new WaitForSecondsRealtime(0.3f);
            if (generation != expectedGeneration) yield break;
            if (textScene != null) textScene.GetComponentInChildren<Camera>().Render();
            if (sourceTexture != null && displayTexture != null) Graphics.Blit(sourceTexture, displayTexture, new Vector2(1f, -1f), new Vector2(0f, 1f));
            GameObject cameraObject = new("DJ Screen Verification Camera"); Camera camera = cameraObject.AddComponent<Camera>();
            camera.enabled = false; camera.orthographic = true; camera.orthographicSize = ScreenHeight * 0.5f; camera.aspect = 16f / 9f;
            camera.transform.position = transform.position + Vector3.forward * 10f; camera.transform.LookAt(transform.position);
            camera.clearFlags = CameraClearFlags.SolidColor; camera.backgroundColor = Color.black; camera.cullingMask = 1 << 29;
            RenderTexture target = new(1280, 720, 16); target.Create(); camera.targetTexture = target;
            Texture2D capture = new(1280, 720, TextureFormat.RGB24, false);
            int previousLayer = gameObject.layer; RenderTexture previous = RenderTexture.active;
            try
            {
                gameObject.layer = 29; camera.Render(); RenderTexture.active = target;
                capture.ReadPixels(new Rect(0, 0, 1280, 720), 0, 0); capture.Apply();
                Directory.CreateDirectory(arguments[index + 1]);
                File.WriteAllBytes(Path.Combine(arguments[index + 1], $"screen-{settings?.revision ?? 0}-{settings?.mode ?? "legacy"}.png"), capture.EncodeToPNG());
            }
            finally { gameObject.layer = previousLayer; RenderTexture.active = previous; target.Release(); Destroy(target); Destroy(capture); Destroy(cameraObject); }
        }

        private IEnumerator FitText(TextMesh text, int expectedGeneration)
        {
            yield return null;
            if (generation != expectedGeneration || text == null) yield break;
            Vector3 size = text.GetComponent<Renderer>().bounds.size;
            float scale = Mathf.Min(1f, ScreenHeight * 0.82f / Mathf.Max(0.01f, size.y));
            if (!settings.scroll) scale = Mathf.Min(scale, ScreenWidth * 0.9f / Mathf.Max(0.01f, size.x));
            text.transform.localScale = Vector3.one * scale; textWidth = size.x * scale;
        }
        private static Color ParseColor(string value, Color fallback) => ColorUtility.TryParseHtmlString(value, out Color color) ? color : fallback;
        private static string WrapText(string value, int columns)
        {
            List<string> lines = new();
            foreach (string original in value.Replace("\r", "").Split('\n'))
            {
                string line = original;
                while (line.Length > columns)
                {
                    int end = line.LastIndexOf(' ', columns); if (end < columns / 2) end = columns;
                    lines.Add(line[..end]); line = line[end..].TrimStart();
                }
                lines.Add(line);
            }
            return string.Join("\n", lines);
        }
        private void SetSolid(Color color)
        {
            imageTexture = new Texture2D(1, 1); imageTexture.SetPixel(0, 0, color); imageTexture.Apply(); screenMaterial.mainTexture = imageTexture;
        }
        private void FitImage(Texture texture)
        {
            float aspect = texture.width / (float)texture.height; float screenAspect = ScreenWidth / ScreenHeight;
            Vector2 scale = aspect > screenAspect ? new Vector2(screenAspect / aspect, 1f) : new Vector2(1f, aspect / screenAspect);
            screenMaterial.mainTextureScale = scale; screenMaterial.mainTextureOffset = (Vector2.one - scale) * 0.5f;
        }
        private static void FlipImage(Texture2D texture)
        {
            Color32[] source = texture.GetPixels32(), flipped = new Color32[source.Length];
            for (int row = 0; row < texture.height; row++) Array.Copy(source, row * texture.width, flipped, (texture.height - 1 - row) * texture.width, texture.width);
            texture.SetPixels32(flipped); texture.Apply(false, false);
        }
        private void StopCurrent()
        {
            generation++; StopAllCoroutines();
            if (player != null) { player.Stop(); player.targetTexture = null; }
            if (textScene != null)
            {
                Camera textCamera = textScene.GetComponentInChildren<Camera>();
                if (textCamera != null) { textCamera.enabled = false; textCamera.targetTexture = null; }
            }
            if (RenderTexture.active == sourceTexture || RenderTexture.active == displayTexture) RenderTexture.active = null;
            screenMaterial.mainTexture = null;
            if (sourceTexture != null) { sourceTexture.Release(); Destroy(sourceTexture); sourceTexture = null; }
            if (displayTexture != null) { displayTexture.Release(); Destroy(displayTexture); displayTexture = null; }
            if (textScene != null) Destroy(textScene); textScene = null; movingText = null;
            if (imageTexture != null) Destroy(imageTexture); imageTexture = null;
            screenMaterial.mainTextureScale = Vector2.one; screenMaterial.mainTextureOffset = Vector2.zero;
            currentId = ""; currentPath = ""; error = ""; loading = false; showing = false; nextSlideAt = float.PositiveInfinity;
        }
        private void Report()
        {
            if (client == null || !client.IsConnected) return;
            client.ReportScreen(settings?.mode ?? "blank", currentId, showing, loading, error, settings?.revision ?? -1);
            nextReportAt = Time.unscaledTime + 1f;
        }
        private static DjScreenItem[] FindLocalMedia()
        {
            string build = Directory.GetParent(Application.dataPath)?.FullName ?? Application.dataPath;
            string project = Directory.GetParent(build)?.FullName ?? build;
            string workspace = Directory.GetParent(project)?.FullName ?? project;
            foreach (string folder in new[] { Path.Combine(build, "DJ_VIDEO"), Path.Combine(project, "DJ_VIDEO"), Path.Combine(workspace, "DJ_VIDEO"), Application.streamingAssetsPath })
            {
                if (!Directory.Exists(folder)) continue;
                string[] images = { ".jpg", ".jpeg", ".png" }, videos = { ".mp4", ".mov", ".m4v", ".webm" };
                DjScreenItem[] found = Directory.EnumerateFiles(folder).Where(file => images.Concat(videos).Contains(Path.GetExtension(file).ToLowerInvariant()))
                    .OrderBy(Path.GetFileName, StringComparer.OrdinalIgnoreCase).Select(file => new DjScreenItem { id = file, path = file,
                        name = Path.GetFileName(file), kind = images.Contains(Path.GetExtension(file).ToLowerInvariant()) ? "image" : "video" }).ToArray();
                if (found.Length > 0) return found;
            }
            return Array.Empty<DjScreenItem>();
        }
        private void OnDestroy() { if (client != null) client.EventReceived -= HandleMessage; StopCurrent(); Destroy(screenMaterial); }
    }
}
