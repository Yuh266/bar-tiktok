using UnityEngine;

namespace TikTokLiveGame
{
    public static class RuntimeBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void StartGame()
        {
            if (Object.FindFirstObjectByType<TikTokGameController>() != null) return;
            // TikTok LIVE Studio captures at 60 FPS. Disable display-rate VSync so
            // high-refresh monitors cannot force uneven 60 FPS capture cadence.
            QualitySettings.vSyncCount = 0;
            Application.targetFrameRate = 60;
            Application.runInBackground = true;
            QualitySettings.antiAliasing = 4;
            QualitySettings.globalTextureMipmapLimit = 0;
            Screen.SetResolution(540, 960, FullScreenMode.Windowed);
            ClubSceneBuilder.Build();
            // A standalone scenery preview never connects to the running LIVE session.
            if (VisualCaptureHarness.InstallFloorPreviewIfRequested()) return;

            GameObject root = new("TikTok Live Game");
            root.AddComponent<ClubOutputDiagnostics>();
            AvatarService avatars = root.AddComponent<AvatarService>();
            TikTokWebSocketClient client = root.AddComponent<TikTokWebSocketClient>();
            Object.FindFirstObjectByType<DjVideoScreen>()?.Initialize(client);
            PlayerManager players = new GameObject("Players").AddComponent<PlayerManager>();
            players.transform.SetParent(root.transform);
            GiftEffectManager giftEffects = root.AddComponent<GiftEffectManager>();
            root.AddComponent<MusicPlaylistPlayer>().Initialize(client);
            root.AddComponent<DuckParade>();
            TikTokGameController game = root.AddComponent<TikTokGameController>();
            game.Initialize(client, players, giftEffects);
            VisualCaptureHarness.InstallIfRequested(root);
        }
    }

    internal sealed class ClubOutputDiagnostics : MonoBehaviour
    {
        private System.Collections.IEnumerator Start()
        {
            yield return null;
            yield return null;
            Debug.Log($"CLUB_OUTPUT {Screen.width}x{Screen.height} MSAA={QualitySettings.antiAliasing}");
        }
    }
}
