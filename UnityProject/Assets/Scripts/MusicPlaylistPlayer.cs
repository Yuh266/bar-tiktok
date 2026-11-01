using System;
using System.Collections;
using System.Globalization;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Networking;

namespace TikTokLiveGame
{
    public sealed class MusicPlaylistPlayer : MonoBehaviour
    {
        private const float DefaultVolume = 0.35f;
        private const float FadeSeconds = 1.2f;
        private AudioSource output;
        private AudioClip currentClip;
        private MusicTrack[] tracks = Array.Empty<MusicTrack>();
        private TikTokWebSocketClient client;
        private string currentPath = "";
        private string error = "";
        private Coroutine loadRoutine;
        private int loadGeneration;
        private bool paused;
        private bool connected;
        private float nextReportAt;
        private int trackIndex;
        private float configuredVolume = DefaultVolume;
        private float trackStartedAt;
        private float watchdogAt;
        private float advanceAt;
        private bool loading;
        private bool advancePending;
        private bool wasPlaying;

        private void Awake()
        {
            tracks = FindTracks(out string selectedFolder).Select(path => new MusicTrack
                { id = path, name = Path.GetFileName(path), path = path }).ToArray();

            configuredVolume = ReadVolume(selectedFolder);
            output = gameObject.AddComponent<AudioSource>();
            output.playOnAwake = false;
            output.loop = false;
            output.spatialBlend = 0f;
            output.volume = 0f;
            output.priority = 128;
            output.mute = Array.IndexOf(Environment.GetCommandLineArgs(), "-musicTestMuted") >= 0;
            gameObject.AddComponent<ClubAudioReactive>().Initialize(output);
            if (tracks.Length > 0) PlayTrack(0);
            else Debug.Log("Music player is ready. Upload MP3, WAV or OGG from the control panel.");
        }

        public void Initialize(TikTokWebSocketClient socketClient)
        {
            client = socketClient;
            client.EventReceived += HandleMusic;
        }

        private void HandleMusic(TikTokEvent message)
        {
            if (message.type == "music_library")
            {
                tracks = (message.tracks ?? Array.Empty<MusicTrack>()).Where(track => track != null &&
                    !string.IsNullOrEmpty(track.id) && !string.IsNullOrEmpty(track.path) && Path.IsPathRooted(track.path) &&
                    new[] { ".mp3", ".wav", ".ogg" }.Contains(Path.GetExtension(track.path).ToLowerInvariant())).ToArray();
                int existing = Array.FindIndex(tracks, track => string.Equals(track.path, currentPath, StringComparison.OrdinalIgnoreCase));
                if (existing >= 0) trackIndex = existing;
                else if (tracks.Length > 0) PlayTrack(0, !paused);
                else { CancelLoad(); StopCurrentClip(); loading = false; advancePending = false; currentPath = ""; }
                return;
            }
            if (message.type != "music_control") return;
            switch (message.action)
            {
                case "select":
                    int index = Array.FindIndex(tracks, track => track.id == message.trackId);
                    if (index >= 0) PlayTrack(index);
                    break;
                case "next": if (tracks.Length > 0) PlayTrack((trackIndex + 1) % tracks.Length, !paused); break;
                case "previous": if (tracks.Length > 0) PlayTrack((trackIndex - 1 + tracks.Length) % tracks.Length, !paused); break;
                case "pause": paused = true; output.Pause(); break;
                case "resume":
                    paused = false;
                    if (currentClip != null) { output.UnPause(); trackStartedAt = Time.unscaledTime - FadeSeconds; }
                    else if (!loading && tracks.Length > 0) PlayTrack(trackIndex);
                    break;
                case "seek":
                    if (currentClip != null && !loading)
                    {
                        try { output.time = Mathf.Clamp(message.position, 0f, Mathf.Max(0f, currentClip.length - 0.05f)); error = ""; }
                        catch (Exception) { error = "Bài nhạc này chưa tua được. Vui lòng thử lại."; }
                        trackStartedAt = Time.unscaledTime - FadeSeconds;
                    }
                    break;
            }
            Report();
        }

        private void Report()
        {
            if (client == null || !client.IsConnected) return;
            string id = tracks.Length > 0 && trackIndex < tracks.Length ? tracks[trackIndex].id : "";
            client.ReportMusic(id, currentClip != null ? output.time : 0f, currentClip != null ? currentClip.length : 0f,
                output.isPlaying, paused, loading, error);
            nextReportAt = Time.unscaledTime + 0.5f;
        }

        private void Update()
        {
            if (output == null) return;
            bool isConnected = client != null && client.IsConnected;
            if (isConnected && !connected) { client.MusicReady(); Debug.Log("Music control ready."); }
            connected = isConnected;
            if (isConnected && Time.unscaledTime >= nextReportAt) Report();
            if (tracks.Length == 0 || paused) return;
            if (advancePending && Time.unscaledTime >= advanceAt)
            {
                advancePending = false;
                PlayTrack((trackIndex + 1) % tracks.Length);
                return;
            }

            if (output.isPlaying)
            {
                wasPlaying = true;
                float fadeIn = Mathf.Clamp01((Time.unscaledTime - trackStartedAt) / FadeSeconds);
                float fadeOut = currentClip == null
                    ? 1f
                    : Mathf.Clamp01((currentClip.length - output.time) / FadeSeconds);
                output.volume = configuredVolume * Mathf.Min(fadeIn, fadeOut);
                watchdogAt = Time.unscaledTime + 3f;
            }
            else if (wasPlaying && !loading)
            {
                wasPlaying = false;
                output.volume = 0f;
                ScheduleAdvance(0.05f);
            }
            else if (!loading && !advancePending && Time.unscaledTime >= watchdogAt)
            {
                Debug.LogWarning("Music watchdog detected a stopped track; advancing the playlist.");
                ScheduleAdvance(0.5f);
            }
        }

        private void PlayTrack(int index, bool play = true)
        {
            if (tracks.Length == 0) return;
            CancelLoad();
            trackIndex = Mathf.Clamp(index, 0, tracks.Length - 1);
            StopCurrentClip();
            currentPath = tracks[trackIndex].path;
            paused = !play;
            error = "";
            loading = true;
            advancePending = false;
            watchdogAt = Time.unscaledTime + 20f;
            loadRoutine = StartCoroutine(LoadAndPlay(currentPath, loadGeneration));
        }

        private void CancelLoad()
        {
            loadGeneration++;
            if (loadRoutine != null) StopCoroutine(loadRoutine);
            loadRoutine = null;
        }

        private IEnumerator LoadAndPlay(string path, int generation)
        {
            AudioType type = AudioTypeFor(path);
            string uri = new Uri(path).AbsoluteUri;
            Debug.Log($"Preparing music {trackIndex + 1}/{tracks.Length}: {path}");
            using UnityWebRequest request = UnityWebRequestMultimedia.GetAudioClip(uri, type);
            request.timeout = 120;
            if (request.downloadHandler is DownloadHandlerAudioClip audioDownload)
                audioDownload.streamAudio = true;
            yield return request.SendWebRequest();
            if (generation != loadGeneration) yield break;

            loading = false;
            loadRoutine = null;
            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogWarning($"Music could not play '{path}': {request.error}");
                error = "Không đọc được bài nhạc này. Chọn bài khác hoặc tải lại file.";
                Report();
                ScheduleAdvance(tracks.Length == 1 ? 2f : 0.75f);
                yield break;
            }

            currentClip = DownloadHandlerAudioClip.GetContent(request);
            if (currentClip == null)
            {
                Debug.LogWarning($"Music decoder returned no audio for '{path}'.");
                error = "File nhạc không phát được. Vui lòng chọn file khác.";
                Report();
                ScheduleAdvance(tracks.Length == 1 ? 2f : 0.75f);
                yield break;
            }

            currentClip.name = $"Music {Path.GetFileName(path)}";
            output.clip = currentClip;
            output.volume = 0f;
            trackStartedAt = Time.unscaledTime;
            watchdogAt = Time.unscaledTime + 5f;
            if (!paused) output.Play();
            else { output.Play(); output.Pause(); }
            Debug.Log($"Music playing {trackIndex + 1}/{tracks.Length}: {path}");
            Report();
        }

        private void StopCurrentClip()
        {
            if (output != null)
            {
                output.Stop();
                output.clip = null;
                output.volume = 0f;
            }
            if (currentClip != null) Destroy(currentClip);
            currentClip = null;
            wasPlaying = false;
        }

        private void ScheduleAdvance(float delay)
        {
            if (advancePending) return;
            advancePending = true;
            advanceAt = Time.unscaledTime + Mathf.Max(0.05f, delay);
        }

        private static AudioType AudioTypeFor(string path)
        {
            return Path.GetExtension(path).ToLowerInvariant() switch
            {
                ".wav" => AudioType.WAV,
                ".ogg" => AudioType.OGGVORBIS,
                _ => AudioType.MPEG
            };
        }

        private static string[] FindTracks(out string selectedFolder)
        {
            string buildRoot = Directory.GetParent(Application.dataPath)?.FullName ?? Application.dataPath;
            string projectRoot = Directory.GetParent(buildRoot)?.FullName ?? buildRoot;
            string workspaceRoot = Directory.GetParent(projectRoot)?.FullName ?? projectRoot;
            string[] folders =
            {
                Path.Combine(buildRoot, "DJ_MUSIC"),
                Path.Combine(projectRoot, "DJ_MUSIC"),
                Path.Combine(workspaceRoot, "DJ_MUSIC"),
                Path.Combine(workspaceRoot, "assets", "music"),
                Application.streamingAssetsPath
            };
            string[] extensions = { ".mp3", ".wav", ".ogg" };
            foreach (string folder in folders)
            {
                if (!Directory.Exists(folder)) continue;
                string[] files = Directory.EnumerateFiles(folder)
                    .Where(candidate => extensions.Contains(Path.GetExtension(candidate), StringComparer.OrdinalIgnoreCase))
                    .OrderBy(candidate => Path.GetFileName(candidate), StringComparer.OrdinalIgnoreCase)
                    .ToArray();
                if (files.Length == 0) continue;
                selectedFolder = folder;
                return files;
            }
            selectedFolder = string.Empty;
            return Array.Empty<string>();
        }

        private static float ReadVolume(string folder)
        {
            if (string.IsNullOrEmpty(folder)) return DefaultVolume;
            string path = Path.Combine(folder, "VOLUME.txt");
            if (!File.Exists(path)) return DefaultVolume;
            string value = File.ReadAllText(path).Trim().Replace(',', '.');
            if (!float.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out float parsed))
                return DefaultVolume;
            if (parsed > 1f) parsed /= 100f;
            return Mathf.Clamp01(parsed);
        }

        private void OnDestroy()
        {
            if (client != null) client.EventReceived -= HandleMusic;
            StopAllCoroutines();
            StopCurrentClip();
        }
    }
}
