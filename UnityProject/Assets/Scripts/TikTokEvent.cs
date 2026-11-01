using System;

namespace TikTokLiveGame
{
    [Serializable]
    public class TikTokEvent
    {
        public string type;
        public string username;
        public string source;
        public string joinCommand;
        public int events;
        public int diamonds;
        public TikTokGiftGuideItem[] guideItems;
        public EngagementState engagement;
        public string state;
        public string message;
        public MusicTrack[] tracks;
        public string trackId;
        public float position;
        public DjScreenSettings screenSettings;
        public DjScreenItem[] screenItems;
        public string userId;
        public string uniqueId;
        public string nickname;
        public string avatar;
        public string team;
        public string loyaltyTitle;
        public int loyaltyDays;
        public string comment;
        public string giftId;
        public string giftName;
        public string action;
        public string masterRuleId;
        public string label;
        public string variant;
        public string titleLabel;
        public string titleVariant;
        public int repeatCount;
        public int diamondCount;
        public int likeCount;
        public int score;
        public int giftPower;
        public int durationMs;
        public int fireworkBursts;
        public bool spectatorOnly;
        public bool joinedNow;
        public bool likeMilestone;
        public bool suppressGiftPresentation;
        public long titleExpiresAt;
        public TikTokPlayerData[] players;
        public TikTokPlayerData[] vipScores;
    }

    [Serializable]
    public class TikTokPlayerData
    {
        public string userId;
        public string uniqueId;
        public string nickname;
        public string avatar;
        public string team;
        public string loyaltyTitle;
        public int loyaltyDays;
        public string titleLabel;
        public string titleVariant;
        public int score;
        public int giftPower;
        public long titleExpiresAt;
    }

    [Serializable]
    public class TikTokGiftGuideItem
    {
        public string source;
        public string iconResource;
        public int requiredLikes;
        public int coinCount;
        public bool priceVerified;
        public string action;
        public string giftId;
        public string giftName;
        public int diamondCount;
        public string giftPictureUrl;
        public string label;
    }

    [Serializable]
    public class MusicTrack { public string id, name, path; }

    [Serializable] public class DjScreenItem { public string id, name, path, kind; }
    [Serializable] public class DjScreenSettings
    {
        public string mode, selectedId, text, color, background;
        public string[] playlist;
        public float slideSeconds = 8f;
        public int fontSize = 64, revision;
        public bool scroll;
    }

    [Serializable]
    internal class ClientMessage
    {
        public string type;
        public string role;
        public string username;
        public string action;
        public string giftName;
        public int count;
        public int userIndex;
        public int value;
        public string trackId;
        public float position, duration;
        public bool playing, paused, loading;
        public string error;
        public string mode, currentId;
        public bool showing;
        public int revision;
    }
}
