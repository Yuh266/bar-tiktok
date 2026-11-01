# bar-tiktok — Bar Club LIVE

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)
[![Unity](https://img.shields.io/badge/Unity-6000.x-black.svg)](https://unity.com/)

**Biến phiên TikTok LIVE thành sàn nhảy 3D tương tác** — Người xem gửi gift, chat, like, follow sẽ xuất hiện trên sàn nhảy với avatar TikTok thật, hiệu ứng ánh sáng, DJ booth và pháo hoa.

## Tương tác mới

Mở `http://127.0.0.1:3000/control.html` → **Tương tác** để điều khiển các hoạt động. Nhấn **F1** trong game để mở quản trị.

**Tự động bật sẵn:** sự kiện đầu tiên xuất hiện sau khoảng 15 giây. Sau mỗi vòng, nghỉ ngẫu nhiên 30–60 giây rồi tự mở vòng mới. Đấu đội, bình chọn sàn và cùng nhảy được trộn thứ tự, không lặp cùng loại liên tiếp. Mỗi lúc chỉ có một vòng; không bỏ qua màn kết quả. Có thể tạm dừng hoặc chỉnh thời gian nghỉ trong mục **Sự kiện ngẫu nhiên**; thiết lập được nhớ khi khởi động lại.

| Tính năng | Người xem tham gia | Kết quả |
|---|---|---|
| Đấu đội Đỏ – Xanh | Chat `đỏ` / `xanh`, thả tim | Vòng 3 phút, vòng sáng theo đội, đội thắng lên sân khấu |
| Bình chọn sàn | Chat `1`, `2`, `3` | Neon lục giác, Disco ô vuông hoặc Dung nham; mỗi người một phiếu |
| Cả phòng cùng nhảy | Chờ đếm ngược rồi chat `nhảy` / `dance` | Đủ người mở tiệc ánh sáng và nhảy đồng bộ |
| Khách quen | Tương tác ở nhiều ngày khác nhau | Danh hiệu sau 3, 7, 30 ngày, lưu qua các buổi LIVE |
| Năng lượng cả phòng | Góp tim miễn phí | Đạt mốc mở 10 giây tiệc; giữ lại tim dư |
| Giọng cảm ơn | Người xem gửi quà | Đọc tên, số lượng, tên quà; gộp combo và xếp hàng |

**Đọc cảm ơn tự động:** mở trang quản trị là tính năng tự bật, tự nối lại khi mất kết nối và chỉ một tab đọc để tránh trùng tiếng. Nếu trình duyệt chặn âm thanh, bấm một lần vào trang để tiếp tục. Trong tab Tương tác có thể chọn giọng tiếng Việt, nghe thử hoặc tắt; lựa chọn tắt, âm lượng và tốc độ được nhớ trên trình duyệt. Giữ tab mở và bật thu âm thanh máy tính trong TikTok LIVE Studio/OBS.

**Bot nhảy:** sàn giữ 5 bot làm nền; người xem thật vào sàn không làm tăng số bot.

Điểm đấu đội tính từ chat chọn đội và tim, tách riêng BXH quà. Mỗi người tối đa 15 điểm tim/vòng. Khi hòa phiếu đổi sàn, ưu tiên sàn hiện tại nếu cùng đứng đầu; nếu không, ưu tiên lựa chọn có số nhỏ hơn.

Khi hết đấu đội, tên người chơi trở về màu thường. Mỗi người thắng được phóng to 60%, có vòng sáng vàng và huy hiệu **ĐỘI CHIẾN THẮNG** trong 12 giây; sân khấu có banner chúc mừng và pháo hoa. Phần thưởng là hiệu ứng, không cộng vào điểm quà.

### Đổi sàn từ web quản trị

Mở tab **Đổi sàn**, chọn **Dùng sàn này** dưới ảnh mẫu. Sàn đổi trực tiếp trong game, có đánh dấu **Đang dùng** và tự lưu lựa chọn. Có bốn mẫu:

- **LED ô vuông cổ điển:** giữ nguyên shader ô vuông đầy màu, nhấp nháy và chạy họa tiết theo nhạc của bản cũ.
- **Neon lục giác:** nền tối, viền xanh tím.
- **Disco ô vuông:** nền tối, viền ô vuông hồng xanh.
- **Dung nham:** các mảng sàn và khe sáng đỏ cam.

Vòng bình chọn của khán giả vẫn dùng ba lựa chọn `1/2/3` (Neon/Disco/Dung nham) và có thể đổi sàn theo kết quả. Sàn cổ điển được chọn trực tiếp trong quản trị.

### Quản lý người chơi và BXH

Trong web quản trị → **Người chơi**:

- Tìm người đang trên sàn theo tên/tài khoản rồi bấm **Kick khỏi sàn**. Nhân vật bị gỡ ngay; điểm quà được giữ. Chat/like thông thường không tự đưa người đó trở lại. Họ có thể vào lại bằng lệnh tham gia, quà hoặc tương tác được luật vào sàn cho phép.
- **Reset BXH quà tặng** → **Xác nhận reset BXH** để tính lại thứ hạng từ 0. Người chơi, tổng quà thống kê, khách quen và sự kiện đang chạy vẫn được giữ.
- Danh sách tự cập nhật. Trạng thái đã kick và điểm BXH sau reset được lưu cùng phiên LIVE.

Ảnh WebP TikTok được chuyển sang PNG bằng dịch vụ ảnh nội bộ. Dữ liệu người xem, danh hiệu, phiên LIVE và quà đã học được lưu tại `TikTokBridge/data/` và không đưa vào Git. Phiên trong vòng 12 giờ có thể khôi phục BXH và tự kết nối lại sau khi khởi động lại Bridge.

### Chạy source

```powershell
git clone https://github.com/Yuh266/bar-tiktok.git
cd bar-tiktok/TikTokBridge
npm ci
npm start
```

Cần Node.js **20.9 trở lên**, khuyến nghị bản LTS. Game Windows được build từ `UnityProject/` bằng Unity **6000.2.10f1** (`build.bat`); thư mục `Build/` không nằm trong source Git.

Kiểm tra backend bằng `npm test`. Kiểm tra giao diện trên Bridge thử nghiệm riêng bằng `npm run test:ui -- http://127.0.0.1:3100` (cần Chrome đã cài).

Dự án phát triển tiếp từ [cherry9001/tiktok-live-bar](https://github.com/cherry9001/tiktok-live-bar), giữ giấy phép và ghi công trong `LICENSE`.

---

## 🎬 Video demo thực tế

[![Xem demo Bar Club trên TikTok LIVE](docs/media/live-demo.png)](https://www.facebook.com/100004611824062/videos/pcb.3562459197251106/37620662724214707)

> Nhấn vào ảnh để xem video demo đầy đủ trên Facebook.

---

## ✨ Tính năng

- 🕺 **Sàn nhảy 3D realtime** — Người xem TikTok tham gia sàn nhảy với nhân vật 3D
- 🎁 **Gift → Hiệu ứng** — Mỗi gift kích hoạt hiệu ứng riêng (zoom camera, pháo hoa, VIP spotlight...)
- 🏆 **Bảng xếp hạng Top 3** — Top gifter đứng trên bục DJ
- 🎵 **DJ Booth** — Phát nhạc + video nền tùy chỉnh
- ⚙️ **Master Rules** — Tùy chỉnh luật game qua giao diện web, không cần code
- 🧪 **Test Lab** — Demo mode với người xem giả để test trước khi live
- 🎨 **Chroma Key** — Bấm F2 để bật nền xanh, ghép vào OBS dễ dàng

---

## 📋 Yêu cầu hệ thống

| Phần mềm | Phiên bản |
|-----------|-----------|
| **Node.js** | ≥ 20.x |
| **Unity** | Chỉ cần khi tự build source; dùng đúng 6000.2.10f1 |
| **TikFinity Desktop** | Phiên bản mới nhất |
| **OBS Studio** | Khuyến nghị cho streaming |
| **Windows** | 10 / 11 (64-bit) |

---

## 🚀 Cài đặt & Chạy

### Cách nhanh nhất trên Windows

Gói Release dưới đây thuộc dự án gốc. Để có các tính năng Tương tác mới trong repo này, hãy build source bằng Unity theo hướng dẫn phía trên.

1. Tải [`BarClub-Live-Windows-v1.0.5.zip`](https://github.com/cherry9001/tiktok-live-bar/releases/latest/download/BarClub-Live-Windows-v1.0.5.zip) trong mục **Releases**.
2. Giải nén toàn bộ ZIP ra một thư mục mới. Không chạy trực tiếp bên trong ZIP.
3. Cài [Node.js 20 LTS trở lên](https://nodejs.org/) nếu máy chưa có.
4. Nhấp đúp `run.bat`. Launcher tự cài thư viện, mở Bridge, Game và Control Panel.

### Dấu hiệu cài đặt thành công

Sau khi chạy `run.bat` lần đầu:

- Cửa sổ **TikTok Bridge** hiển thị địa chỉ `http://127.0.0.1:3000`.
- Trình duyệt mở Control Panel và logo Bar Club hiển thị bình thường.
- Game mở với cửa sổ `TikTokLiveGameUnity` và báo kết nối Node thành công.
- Gói Windows đã kèm `Build/DJ_MUSIC/nhacnen.MP3`; có thể thay bằng MP3/WAV/OGG của bạn.

Luồng trên đã được kiểm thử trọn vẹn từ ZIP sạch trên Windows 11: launcher tự
chạy `npm ci`, Bridge/Control Panel/WebSocket hoạt động và game kết nối cổng 3000.

> `run.bat` không tự tắt chương trình khác đang dùng cổng 3000. Nếu launcher báo
> xung đột cổng, hãy đóng đúng chương trình được báo rồi chạy lại để tránh mất dữ liệu.

> **Không tải “Source code (zip)” nếu bạn chỉ muốn chơi.** File source tự động của
> GitHub không chứa thư mục `Build`; hãy tải đúng file Windows ở mục Releases.

### Dành cho lập trình viên — Clone source

```bash
git clone https://github.com/Yuh266/bar-tiktok.git
cd bar-tiktok
```

Source GitHub không chứa game đã biên dịch. Cài Unity `6000.2.10f1`, sau đó chạy
`build.bat` hoặc mở `UnityProject/` bằng Unity Hub để tạo thư mục `Build`.

### Chạy thủ công — Cài đặt Node Bridge

```bash
cd TikTokBridge
copy .env.example .env
npm ci
npm start
```

### Mở Control Panel

Truy cập [http://127.0.0.1:3000/control.html](http://127.0.0.1:3000/control.html) trên trình duyệt.

### Chạy Unity Game

- **Nếu có file build:** Chạy `run.bat`
- **Nếu clone source:** Cài Unity `6000.2.10f1`, rồi chạy `build.bat`

### Kết nối TikTok LIVE

1. Mở TikFinity Desktop → đăng nhập → bật LIVE
2. Trong Control Panel, nhập username TikTok đang live → **Kết nối**

---

## 📁 Cấu trúc thư mục

```
├── TikTokBridge/          # Node.js backend — bridge TikTok ↔ Unity
│   ├── server.js          # Server chính
│   ├── config/            # Cấu hình game, gifts, master rules
│   ├── public/            # Control panel (HTML/JS/CSS)
│   ├── src/               # Logic xử lý sự kiện, bảo mật
│   ├── assets/            # Banner, GIF hiệu ứng
│   └── test/              # Unit tests
│
├── UnityProject/          # Unity 6 — Game 3D
│   ├── Assets/Scripts/    # C# scripts (24 files)
│   └── Assets/Editor/     # Editor tools & build script
│
├── DJ_MUSIC/              # 🎵 Thả file nhạc MP3/WAV/OGG vào đây
├── DJ_VIDEO/              # 🎬 Thả file video MP4/PNG vào đây
├── LiveAssets/             # Hình nền, GIF hiệu ứng
├── Build/                 # Có trong gói Release; không có trong source Git
│
├── build.bat              # Script build Unity → EXE
├── run.bat                # Script chạy Node + Game
├── LICENSE                # Giấy phép MIT
└── README.md              # File này
```

---

## ⌨️ Phím tắt trong Game

| Phím | Chức năng |
|------|-----------|
| `F1` | Ẩn / hiện bảng điều khiển |
| `F2` | Bật / tắt nền xanh Chroma Key |
| `F11` | Toàn màn hình |

---

## 💬 Lệnh chat người xem

| Lệnh | Hiệu ứng |
|-------|-----------|
| `nhảy` / `dance` | Nhân vật nhảy |
| `đi vòng` / `walk` | Nhân vật đi bước tại chỗ |
| `đổi nv` | Đổi nhân vật ngẫu nhiên |

---

## 🎁 Hệ thống Gift

| Mức gift | Kim cương | Hiệu ứng |
|----------|-----------|-----------|
| Gift nhỏ | 1–9 💎 | Nhân vật nhảy, vào sàn |
| Gift trung | 10–99 💎 | Zoom camera, đổi nhân vật |
| Gift VIP | 100+ 💎 | Spotlight, pháo hoa, top DJ |

> Tùy chỉnh qua **Master Rules** trong Control Panel → tab ⚙️ Master Rules.

---

## 🎵 Thêm nhạc & video

- **Nhạc nền DJ:** Thả file `.mp3`, `.wav`, `.ogg` vào thư mục `DJ_MUSIC/`
- **Video nền:** Thả file `.mp4`, `.mov`, `.webm` hoặc ảnh `.png`, `.jpg` vào `DJ_VIDEO/`
- Game tự phát lặp và tắt tiếng video

> ⚠️ Hãy sử dụng nhạc và video có bản quyền hợp lệ.

---

## 🔧 Tùy chỉnh nâng cao

### Master Rules (không cần code)

Mở Control Panel → tab **⚙️ Master Rules** để:
- Thêm/sửa luật: Gift nào → hiệu ứng gì
- Chọn chế độ tham gia sàn (chat keyword hoặc mọi tương tác)
- Bật/tắt tự động vào sàn khi tặng gift

### Cấu hình Node Bridge

Sửa file `TikTokBridge/.env`:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
LIVE_PROVIDER=tikfinity
TIKFINITY_WS_URL=ws://127.0.0.1:21213/
ALLOW_LAN=0
```

Bridge thực sự nạp file `.env` khi khởi động. Biến môi trường của Windows được ưu
tiên nếu cùng tên. Bản game dựng sẵn kết nối cố định tới cổng `3000`; chỉ đổi
`PORT` khi bạn dùng riêng Control Panel/Bridge hoặc đã tự build lại Unity client.

### Xử lý lỗi cài đặt thường gặp

- **`node` hoặc `npm` không được nhận diện:** cài Node.js 20+, đóng cửa sổ cũ rồi chạy lại `run.bat`.
- **`npm ci` thất bại:** kiểm tra kết nối Internet, tắt proxy/VPN lỗi và chạy lại; không sao chép `node_modules` từ máy khác.
- **Cổng 3000 đang bị chiếm:** đóng đúng ứng dụng/PID được launcher báo; launcher không tự tắt ứng dụng khác.
- **Không tìm thấy game:** bạn đã tải Source ZIP hoặc clone Git. Hãy tải bản Windows trong Releases hoặc tự build bằng Unity.
- **Windows SmartScreen cảnh báo:** chọn **More info → Run anyway** nếu file được tải từ Release chính thức của repo này.
- **TikTok chưa có sự kiện:** mở TikFinity, kiểm tra WebSocket `ws://127.0.0.1:21213/`, sau đó thử **Test Lab** trước.

---

## 🧪 Test

```bash
cd TikTokBridge
npm test                    # Chạy unit tests
npm run security:smoke      # Test bảo mật WebSocket
```

Hoặc dùng **Test Lab** trong Control Panel để tạo người xem giả.

---

## 📺 Ghép vào OBS

1. Thêm source **Game Capture** → chọn cửa sổ Bar Club Live
2. Bấm **F2** trong game để bật Chroma Key (nền xanh)
3. Trong OBS: thêm filter **Chroma Key** → chọn màu xanh

---

## 📜 Giấy phép

Dự án được phát hành theo [Giấy phép MIT](LICENSE).

Tài nguyên bên thứ ba (GIF, hình ảnh) có thể có giấy phép riêng — xem `sources.json` trong từng thư mục assets.

---

## 📞 Liên hệ

- 🌐 Website: [ongchummo.com](https://ongchummo.com)
- 📱 Zalo: 0977.896.644
- 📧 Email: toanhvan90@gmail.com

---

<p align="center">
  Made with ❤️ by <strong>Bar Club</strong>
</p>
