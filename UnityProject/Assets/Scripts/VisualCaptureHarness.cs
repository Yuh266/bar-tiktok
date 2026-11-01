using System;
using System.Collections;
using UnityEngine;

namespace TikTokLiveGame
{
    public sealed class VisualCaptureHarness : MonoBehaviour
    {
        public static bool InstallFloorPreviewIfRequested()
        {
            string[] arguments = Environment.GetCommandLineArgs();
            if (Array.IndexOf(arguments, "-floorPreview") < 0) return false;
            Camera camera = Camera.main;
            camera.GetComponent<ClubCameraController>().enabled = false;
            camera.transform.position = new Vector3(0f, 12f, 20.5f);
            camera.transform.LookAt(new Vector3(0f, 0f, -1.5f));
            camera.fieldOfView = 52f;
            VisualCaptureHarness harness = new GameObject("Floor Preview").AddComponent<VisualCaptureHarness>();
            int captureIndex = Array.IndexOf(arguments, "-capturePath");
            if (captureIndex >= 0 && captureIndex + 1 < arguments.Length)
                harness.StartCoroutine(harness.CaptureFloor(arguments[captureIndex + 1]));
            return true;
        }

        private IEnumerator CaptureFloor(string path)
        {
            float delay = 4f;
            string[] arguments = Environment.GetCommandLineArgs();
            int delayIndex = Array.IndexOf(arguments, "-captureDelay");
            if (delayIndex >= 0 && delayIndex + 1 < arguments.Length && float.TryParse(arguments[delayIndex + 1], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out float requestedDelay))
                delay = Mathf.Clamp(requestedDelay, 1f, 60f);
            yield return new WaitForSecondsRealtime(delay);
            ScreenCapture.CaptureScreenshot(path);
            if (Array.IndexOf(arguments, "-verifyCommunity") >= 0)
            {
                int real = 0, podium = 0, colored = 0, victory = 0;
                foreach (PlayerActor actor in FindObjectsByType<PlayerActor>(FindObjectsSortMode.None))
                {
                    if (actor.IsNpc) continue;
                    real++;
                    if (actor.IsTopRanked) podium++;
                    Color nameColor = actor.transform.Find("Name").GetComponent<TextMesh>().color;
                    if (Mathf.Abs(nameColor.r - nameColor.g) + Mathf.Abs(nameColor.g - nameColor.b) > 0.1f) colored++;
                    if (actor.transform.Find("Team Victory Badge").gameObject.activeSelf) victory++;
                }
                Debug.Log($"COMMUNITY_VISUAL real={real} podium={podium} coloredNames={colored} victoryBadges={victory}");
            }
            yield return new WaitForSecondsRealtime(1f);
            if (System.IO.File.Exists(path)) Debug.Log($"Floor preview saved to {path}");
            else Debug.LogWarning($"Floor preview was not written: {path}");
            if (Array.IndexOf(Environment.GetCommandLineArgs(), "-captureExit") >= 0) Application.Quit();
        }

        public static void InstallIfRequested(GameObject root)
        {
            string[] arguments = Environment.GetCommandLineArgs();
            int stateIndex = Array.IndexOf(arguments, "-captureStatePath");
            if (stateIndex >= 0 && stateIndex + 1 < arguments.Length)
            {
                VisualCaptureHarness capture = root.AddComponent<VisualCaptureHarness>();
                capture.StartCoroutine(capture.CaptureFloor(arguments[stateIndex + 1]));
                return;
            }
            int index = Array.IndexOf(arguments, "-capturePath");
            if (index < 0 || index + 1 >= arguments.Length) return;
            VisualCaptureHarness harness = root.AddComponent<VisualCaptureHarness>();
            harness.StartCoroutine(harness.Capture(arguments[index + 1]));
        }

        private IEnumerator Capture(string path)
        {
            yield return new WaitForSecondsRealtime(1.5f);
            TikTokWebSocketClient client = FindFirstObjectByType<TikTokWebSocketClient>();
            float deadline = Time.realtimeSinceStartup + 8f;
            while (client != null && !client.IsConnected && Time.realtimeSinceStartup < deadline)
                yield return null;
            yield return new WaitForSecondsRealtime(0.5f);
            ScreenCapture.CaptureScreenshot(path + ".likes.png");
            yield return new WaitForSecondsRealtime(0.3f);
            client?.StartDemo(40);
            yield return new WaitForSecondsRealtime(5f);
            client?.StopDemo();
            client?.DemoGift(300, 7);
            client?.DemoGift(200, 8);
            client?.DemoGift(100, 9);
            yield return new WaitForSecondsRealtime(9f);
            FindFirstObjectByType<GiftEffectManager>()?.PartyBurst();
            client?.DemoGift(1000, 9);
            yield return new WaitForSecondsRealtime(0.8f);
            ScreenCapture.CaptureScreenshot(path + ".stage.png");
            yield return new WaitForSecondsRealtime(0.5f);
            client?.DemoGift(100, 7);
            yield return new WaitForSecondsRealtime(1.2f);
            ScreenCapture.CaptureScreenshot(path);
            Debug.Log($"Visual capture saved to {path}");
            yield return new WaitForSecondsRealtime(2f);
            Application.Quit();
        }
    }
}
