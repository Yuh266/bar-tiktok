using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

namespace TikTokLiveGame
{
    public sealed class AvatarService : MonoBehaviour
    {
        private readonly Dictionary<string, Sprite> cache = new();
        private readonly Dictionary<string, List<Action<Sprite>>> waiting = new();
        private readonly Queue<string> queue = new();
        private int activeDownloads;
        private const int MaximumConcurrent = 4;
        public static AvatarService Instance { get; private set; }

        private void Awake()
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        public void Load(string url, Action<Sprite> callback)
        {
            if (!Uri.TryCreate(url, UriKind.Absolute, out Uri uri) ||
                (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
            {
                callback?.Invoke(null);
                return;
            }
            if (cache.TryGetValue(url, out Sprite sprite))
            {
                callback?.Invoke(sprite);
                return;
            }
            if (waiting.TryGetValue(url, out List<Action<Sprite>> callbacks))
            {
                callbacks.Add(callback);
                return;
            }
            waiting[url] = new List<Action<Sprite>> { callback };
            queue.Enqueue(url);
            Pump();
        }

        private void Pump()
        {
            while (activeDownloads < MaximumConcurrent && queue.Count > 0)
            {
                activeDownloads++;
                StartCoroutine(Download(queue.Dequeue()));
            }
        }

        private IEnumerator Download(string url)
        {
            Sprite result = null;
            string imageUrl = ImageUrl(url);
            string host = new Uri(url).Host;
            for (int attempt = 0; attempt < 3 && result == null; attempt++)
            {
                using UnityWebRequest request = UnityWebRequestTexture.GetTexture(imageUrl, true);
                request.timeout = 12;
                yield return request.SendWebRequest();
                if (request.result == UnityWebRequest.Result.Success)
                {
                    Texture2D texture = null;
                    try
                    {
                        texture = DownloadHandlerTexture.GetContent(request);
                        texture.wrapMode = TextureWrapMode.Clamp;
                        texture.filterMode = FilterMode.Bilinear;
                        int side = Mathf.Min(texture.width, texture.height);
                        Rect rect = new((texture.width - side) * 0.5f, (texture.height - side) * 0.5f, side, side);
                        result = Sprite.Create(texture, rect, new Vector2(0.5f, 0.5f), side);
                        cache[url] = result;
                        Debug.Log($"AVATAR_LOADED host={host} size={texture.width}x{texture.height}");
                    }
                    catch (Exception exception)
                    {
                        if (texture != null) Destroy(texture);
                        Debug.LogWarning($"Avatar decode failed host={host}: {exception.GetType().Name}");
                    }
                }
                if (result == null)
                {
                    Debug.LogWarning($"Avatar download failed host={host} attempt={attempt + 1} HTTP={request.responseCode}");
                    if (attempt < 2) yield return new WaitForSecondsRealtime(attempt + 1);
                }
            }
            if (waiting.Remove(url, out List<Action<Sprite>> callbacks))
                foreach (Action<Sprite> callback in callbacks)
                {
                    try { callback?.Invoke(result); }
                    catch (Exception exception) { Debug.LogException(exception); }
                }
            activeDownloads--;
            Pump();
        }

        private static string ImageUrl(string url)
        {
            string host = new Uri(url).Host;
            string[] domains = { "tiktokcdn.com", "tiktokcdn-us.com", "tiktokcdn-eu.com", "ibytedtos.com", "byteoversea.com" };
            foreach (string domain in domains)
                if (host.Equals(domain, StringComparison.OrdinalIgnoreCase) || host.EndsWith("." + domain, StringComparison.OrdinalIgnoreCase))
                    return "http://127.0.0.1:3001/avatar?url=" + Uri.EscapeDataString(url);
            return url;
        }
    }
}
