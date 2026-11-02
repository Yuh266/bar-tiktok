using System;
using System.Collections.Generic;
using System.Collections;
using System.Linq;
using UnityEngine;
using UnityEngine.Networking;

namespace TikTokLiveGame
{
    public sealed partial class TikTokGameController
    {
        private string joinCommand = "";
        private string sessionSource = "idle";
        private bool guideLoaded;
        private float viewerGuideStartedAt;
        private TikTokGiftGuideItem[] viewerGuide = Array.Empty<TikTokGiftGuideItem>();
        private readonly Dictionary<string, Texture2D> giftIcons = new();
        private readonly HashSet<string> pendingGiftIcons = new();
        private GUIStyle giftNameStyle;
        private GUIStyle giftDescriptionStyle;
        private float viewerOverlayBottom = 139f;
        private GUIStyle viewerSmall;
        private GUIStyle viewerBody;
        private GUIStyle viewerHeading;
        private GUIStyle viewerBrand;
        private GUIStyle brandPanel;
        private GUIStyle rankPanel;
        private GUIStyle giftPanel;
        private Texture2D viewerStar;

        private void RefreshGiftIcons()
        {
            foreach (TikTokGiftGuideItem item in viewerGuide)
            {
                if (!string.IsNullOrEmpty(item.iconResource) && Resources.Load<Texture2D>(item.iconResource) != null) continue;
                string url = item.giftPictureUrl;
                if (string.IsNullOrEmpty(url) || giftIcons.ContainsKey(url) || !pendingGiftIcons.Add(url)) continue;
                StartCoroutine(DownloadGiftIcon(url));
            }
        }

        private IEnumerator DownloadGiftIcon(string url)
        {
            using UnityWebRequest request = UnityWebRequestTexture.GetTexture(url, true);
            request.timeout = 8;
            yield return request.SendWebRequest();
            pendingGiftIcons.Remove(url);
            if (request.result != UnityWebRequest.Result.Success) yield break;
            Texture2D image = DownloadHandlerTexture.GetContent(request);
            image.filterMode = FilterMode.Bilinear;
            image.wrapMode = TextureWrapMode.Clamp;
            image.mipMapBias = -1f;
            giftIcons[url] = image;
            Debug.Log($"GIFT_ICON_NATIVE {image.width}x{image.height}");
        }

        private void ClearGiftIcons()
        {
            foreach (Texture2D image in giftIcons.Values) if (image != null) Destroy(image);
            giftIcons.Clear();
        }

        private void EnsureViewerStyles()
        {
            if (viewerSmall != null) return;
            brandPanel = AssetPanelStyle("UiPanels/brand-panel");
            rankPanel = AssetPanelStyle("UiPanels/rank-panel");
            giftPanel = AssetPanelStyle("UiPanels/gift-panel");
            viewerStar = Resources.Load<Texture2D>("Vfx/star_04");
            viewerSmall = new GUIStyle(GUI.skin.label) { fontSize = 12, richText = false, clipping = TextClipping.Clip, normal = { textColor = new Color(0.88f, 0.93f, 1f) } };
            viewerBody = new GUIStyle(viewerSmall) { fontSize = 14, fontStyle = FontStyle.Bold, normal = { textColor = Color.white } };
            viewerHeading = new GUIStyle(viewerSmall) { fontSize = 13, fontStyle = FontStyle.Bold, normal = { textColor = new Color(0.45f, 0.96f, 1f) } };
            viewerBrand = new GUIStyle(viewerBody) { fontSize = 22 };
            giftNameStyle = new GUIStyle(viewerBody) { fontSize = 15, wordWrap = true, clipping = TextClipping.Overflow };
            giftDescriptionStyle = new GUIStyle(viewerSmall) { fontSize = 13, wordWrap = true, clipping = TextClipping.Overflow };
            bannerStyle.fontSize = 15;
            bannerStyle.wordWrap = false;
            bannerStyle.richText = false;
        }

        private static string ViewerText(string value, int max)
        {
            value = (value ?? "").Replace('\n', ' ').Replace('\r', ' ');
            return value.Length > max ? value.Substring(0, max - 1) + "…" : value;
        }

        private static GUIStyle AssetPanelStyle(string path)
        {
            Texture2D texture = Resources.Load<Texture2D>(path);
            return new GUIStyle { normal = { background = texture }, border = new RectOffset(16, 16, 16, 16) };
        }

        private static void DrawAssetPanel(Rect rect, GUIStyle style, Color accent)
        {
            Color previous = GUI.color;
            GUI.color = accent;
            GUI.Box(rect, GUIContent.none, style);
            GUI.color = new Color(0.018f, 0.026f, 0.055f, 0.97f);
            GUI.Box(new Rect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4), GUIContent.none, style);
            GUI.color = previous;
        }

        private void DrawGiftBanner(float width, string text)
        {
            EnsureViewerStyles();
            GUIStyle label = viewerBannerLabel ??= new GUIStyle(viewerBody) { fontSize = 13, wordWrap = true, clipping = TextClipping.Overflow, alignment = TextAnchor.MiddleCenter };
            float labelHeight = label.CalcHeight(new GUIContent(text), 430f);
            Rect rect = new(width * 0.5f - 230f, hudVisible ? Mathf.Max(174f, viewerOverlayBottom + 8f) : 90f, 460f, Mathf.Max(38f, labelHeight + 14f));
            DrawAssetPanel(rect, brandPanel, new Color(1f, 0.55f, 0.8f, 0.96f));
            GUI.Label(new Rect(rect.x + 15, rect.y + 7, 430, labelHeight), text, label);
        }

        private GUIStyle viewerBannerLabel;

        private static string FriendlyGiftEffect(TikTokGiftGuideItem item)
        {
            return item.action switch
            {
                "camera" => "Zoom vào người tặng",
                "change" => "Đổi nhân vật",
                "walk" => "Nhún nhảy tại chỗ",
                "dragon" => "Cưỡi rồng bay",
                "medal" => "Nhận cánh VIP",
                "fireworks" => "Bắn pháo hoa",
                "grow" => "Nhân vật khổng lồ",
                "topdj" => "Lên bục DJ",
                _ => string.IsNullOrWhiteSpace(item.label) ? "Kích hoạt hiệu ứng quà" : item.label
            };
        }

        private void DrawViewerHud(float width, float height)
        {
            EnsureViewerStyles();
            float x = (width - 540f) * 0.5f + 10;
            DrawAssetPanel(new Rect(x, 10, 190, 56), brandPanel, new Color(0.18f, 0.85f, 1f, 0.94f));
            GUI.Label(new Rect(x + 11, 11, 174, 30), "BAR CLUB", viewerBrand);
            string join = !guideLoaded ? "Tham gia sàn nhảy" : !string.IsNullOrWhiteSpace(joinCommand) ? $"Chat \"{ViewerText(joinCommand, 16)}\" để lên sàn" : "Tặng quà để lên sàn";
            GUI.Label(new Rect(x + 11, 43, 174, 18), join, viewerSmall);

            float rankX = x + 276;
            const float panelWidth = 244f;
            const float rankPanelHeight = 34f + PlayerManager.TopRankCount * 18f;
            float giftY = 10f + rankPanelHeight + 5f;
            viewerOverlayBottom = Mathf.Max(viewerOverlayBottom, 10f + rankPanelHeight);
            DrawAssetPanel(new Rect(rankX, 10, panelWidth, rankPanelHeight), rankPanel, new Color(0.65f, 0.4f, 1f, 0.94f));
            GUI.Label(new Rect(rankX + 18, 14, 208, 19), $"TOP {PlayerManager.TopRankCount} QUÀ TRÊN SÀN", viewerHeading);
            Donor[] top = ActiveDonors().Take(PlayerManager.TopRankCount).ToArray();
            Color previous = GUI.color;
            for (int index = 0; index < PlayerManager.TopRankCount; index++)
            {
                GUI.color = index == 0 ? new Color(1f, 0.84f, 0.35f) : Color.white;
                float y = 34 + index * 18;
                string name = index < top.Length ? ViewerText(top[index].Name, 22) : "—";
                GUI.Label(new Rect(rankX + 14, y, 168, 19), $"{index + 1}  {name}", viewerBody);
                if (index < top.Length) GUI.Label(new Rect(rankX + 184, y, 47, 19), top[index].Score.ToString("N0"), viewerSmall);
            }
            GUI.color = previous;
            if (viewerGuide.Length == 0) return;
            // One complete gift at a time keeps native icons legible without widening the HUD.
            int selected = (int)((Time.unscaledTime - viewerGuideStartedAt) / 5f) % viewerGuide.Length;
            TikTokGiftGuideItem item = viewerGuide[selected];
            string giftDisplayName = (item.giftName ?? "Quà tặng").Trim();
            bool freeLikes = item.source == "like";
            string cost = freeLikes ? "Miễn phí · Không dùng xu" : item.priceVerified ? $"{item.coinCount:N0} xu / quà" : "Xem giá trên TikTok";
            string effect = "Hiệu ứng: " + FriendlyGiftEffect(item);
            const float textWidth = 174f;
            float nameHeight = giftNameStyle.CalcHeight(new GUIContent(giftDisplayName), textWidth);
            float effectHeight = giftDescriptionStyle.CalcHeight(new GUIContent(effect), textWidth);
            float cardHeight = Mathf.Max(106f, 44f + nameHeight + effectHeight);
            DrawAssetPanel(new Rect(rankX, giftY, panelWidth, cardHeight), giftPanel, new Color(0.15f, 0.8f, 1f, 0.94f));
            GUI.Label(new Rect(rankX + 14, giftY + 4, 216, 18), freeLikes ? "THẢ TIM · MIỄN PHÍ" : $"QUÀ · HIỆU ỨNG   {selected + 1}/{viewerGuide.Length}", viewerHeading);
            Texture2D icon = viewerStar;
            if (!string.IsNullOrEmpty(item.iconResource)) icon = Resources.Load<Texture2D>(item.iconResource) ?? icon;
            if (icon == viewerStar && !string.IsNullOrEmpty(item.giftPictureUrl) && giftIcons.TryGetValue(item.giftPictureUrl, out Texture2D actual)) icon = actual;
            if (icon != null)
            {
                Color previousTint = GUI.color;
                if (freeLikes)
                {
                    GUI.color = new Color(1f, 0.2f, 0.45f);
                    GUI.DrawTextureWithTexCoords(new Rect(rankX + 12, giftY + 29, 46, 46), icon, new Rect(0.25f, 0.25f, 0.5f, 0.5f), true);
                }
                else GUI.DrawTexture(new Rect(rankX + 12, giftY + 29, 46, 46), icon, ScaleMode.ScaleToFit, true);
                GUI.color = previousTint;
            }
            float textX = rankX + 64;
            GUI.Label(new Rect(textX, giftY + 25, textWidth, nameHeight), giftDisplayName, giftNameStyle);
            GUI.Label(new Rect(textX, giftY + 25 + nameHeight, textWidth, 18), cost, viewerSmall);
            GUI.Label(new Rect(textX, giftY + 43 + nameHeight, textWidth, effectHeight), effect, giftDescriptionStyle);
            viewerOverlayBottom = Mathf.Max(viewerOverlayBottom, giftY + cardHeight);
            // No feed, operator statistics, connection labels, or UI in the comment region.
        }
    }
}
