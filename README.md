# bar-tiktok — Bar Club LIVE

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)
[![Unity](https://img.shields.io/badge/Unity-6000.x-black.svg)](https://unity.com/)

**Biến phiên TikTok LIVE thành sàn nhảy 3D tương tác** — Người xem gửi gift, chat, like, follow sẽ xuất hiện trên sàn nhảy với avatar TikTok thật, hiệu ứng ánh sáng, DJ booth và pháo hoa.

## Bản dự án đầy đủ

Repo chứa toàn bộ nội dung thư mục dự án hiện tại: source Unity/Node.js, game Windows trong `Build/`, nhạc, ảnh/video, `.env`, dữ liệu LIVE và các bản sao lưu trong `TikTokBridge/data/`. Thư viện đã cài và cache Unity cũng được giữ theo yêu cầu lưu đầy đủ. Cài Node.js 20.9+ rồi chạy `run.bat`; Unity chỉ cần khi tự build lại. Dữ liệu LIVE là bản chụp tại thời điểm commit, không tự đồng bộ lên Git khi LIVE tiếp tục chạy.

## Tương tác mới

Mở `http://127.0.0.1:3000/control.html` → **Tương tác** để điều khiển các hoạt động. Nhấn **F1** trong game để mở quản trị.

**Bật/tắt trò chơi:** trong **Tương tác**, nút **Tắt trò chơi** dừng ngay đấu đội Đỏ–Xanh, bình chọn và cùng nhảy, đồng thời ẩn ô trò chơi trong game. Ô năng lượng vẫn nhận tim và mở tiệc. Trạng thái tắt được nhớ khi mở lại; nút đổi thành **Bật trò chơi** để mở lại. Khi bật tự động, sự kiện đầu tiên xuất hiện sau khoảng 15 giây; các vòng nghỉ ngẫu nhiên 30–60 giây, trộn thứ tự và không lặp cùng loại liên tiếp. Có thể tạm dừng tự chạy hoặc chỉnh thời gian nghỉ riêng trong mục **Sự kiện ngẫu nhiên**.

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

**Đoàn vịt và người xem:** tự xuất hiện lần đầu sau 20–35 giây. Một vịt dẫn đầu, 3–8 người xem được chọn ngẫu nhiên nối đuôi ở giữa và một vịt chốt đoàn, cùng đi một vòng trong vùng sàn trống phía dưới khán giả khoảng 6 giây kèm tiếng vịt nhẹ. Phòng ít người thì chọn theo số người đang có; không dùng bot thay người xem và giữ nguyên người đang đứng bàn DJ. Camera tự zoom xa, lấy tâm vùng diễu hành phía dưới để thấy rõ cả đoàn, kể cả khi có quà đang zoom gần. Hết lượt, người xem về vị trí theo thứ hạng hiện tại và camera trở lại bình thường; nghỉ ngẫu nhiên 45–90 giây rồi chạy tiếp. Avatar của Top 5 tặng quà được tăng 20%; khi rời Top 5 trở về kích thước thường.

**Cưỡi rồng bay:** quà **Finger Heart / Trái tim ngón tay · 5 xu** (ID `5487`) đưa người tặng lên rồng ngọc xanh có cánh tím và sừng vàng, bay quanh sân khấu khoảng 5 giây. Camera theo cả rồng và người cưỡi, sau đó hạ xuống vị trí sàn/bục theo thứ hạng hiện tại. Nhiều người tặng được xếp lượt; không chồng cảnh bay với đoàn vịt, không kéo người giữ bàn DJ xuống và không tự xuất hiện khi chưa có quà. Có thể chọn hành động **Cưỡi rồng bay** trong Master Rules; thời lượng từ 5 đến 300 giây. Trong tab Events có nút thử Finger Heart. Quà này hiện dùng cho rồng bay; lệnh chat `đi vòng`/`walk` vẫn hoạt động.

**Nhạc DJ trong quản trị:** mở tab **Nhạc DJ**, chọn file rồi bấm **Tải nhạc lên** (MP3/WAV/OGG, tối đa 250 MB/file, chọn nhiều bài được). Nhạc lưu trong `DJ_MUSIC/` và phát trực tiếp từ game. Có thể chọn bài, phát/tạm dừng, bài trước/tiếp, tua ±10 giây, kéo thanh tua hoặc nhập thời gian như `02:30`. Hết bài tự chuyển bài và lặp danh sách. Tải thêm nhạc không làm bài đang nghe chạy lại; trạng thái/thời gian trên quản trị được báo từ bộ phát thật. Có thể đổi thư mục nhạc bằng biến môi trường `MUSIC_DIR` của Bridge. Bản đầy đủ này có kèm các file nhạc hiện tại.

**Màn hình DJ trong quản trị:** mở tab **Màn hình DJ** để tải ảnh PNG/JPG (tối đa 20 MB, 4096 × 4096 px) hoặc video MP4/WebM/MOV/M4V (tối đa 500 MB, ưu tiên MP4/H.264). Chọn phát một ảnh/video, slideshow trộn ảnh–video có sắp thứ tự và thời gian chuyển 2–120 giây, hiển thị chữ có màu/cỡ chữ/nền/chạy ngang, hoặc tắt màn hình. Bấm **Lưu & áp dụng màn hình** để đổi trực tiếp trong game; cấu hình được giữ khi mở lại. Video tắt tiếng để không chồng nhạc DJ. File riêng lưu trong `DJ_VIDEO/`, cấu hình ở `TikTokBridge/data/dj-screen.json`, được đưa kèm trong bản đầy đủ; đổi thư mục qua `SCREEN_DIR` nếu cần.

**Chống spam combo quà:** cùng người, cùng loại quà chỉ chặn lặp cảm ơn và zoom trong 1 giây tính từ lần kích hoạt gần nhất; hết 1 giây được kích hoạt lại dù vẫn đang gửi liên tục. Đổi loại quà được kích hoạt ngay, kể cả đổi về quà trước đó. Toàn bộ quà và điểm BXH vẫn cộng đủ.

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
- Game và danh sách kick dùng cùng danh sách người trên sàn, đồng bộ mỗi giây. Khi có tối đa 80 người, nhân vật được giữ lại dù đã lâu không tương tác. Chỉ khi vượt 80 mới gỡ người không tương tác ít nhất 10 phút, ưu tiên lâu nhất và chỉ gỡ số lượng dư để giữ sàn đông. Nếu mọi người vẫn tương tác, giữ họ trong giới hạn kỹ thuật 400 người. Điểm BXH vẫn giữ, 5 bot nền đếm riêng; khi tìm kiếm, quản trị hiển thị số kết quả trên tổng số người.
- Bục Top 5 và bảng Top trong game chọn người còn trên sàn theo điểm quà. Từ trái sang phải: Top 4 – Top 2 – Top 1 – Top 3 – Top 5. Khi một người rời, người có điểm cao tiếp theo trên sàn tự lên thay; người quay lại được xét bằng điểm đã giữ. BXH tổng trong quản trị vẫn giữ điểm của cả người đã rời.

Ảnh WebP TikTok được chuyển sang PNG bằng dịch vụ ảnh nội bộ. Dữ liệu người xem, danh hiệu, phiên LIVE và quà đã học được lưu tại `TikTokBridge/data/` và được đưa kèm trong bản đầy đủ theo yêu cầu chủ repo. Phiên trong vòng 12 giờ có thể khôi phục BXH và tự kết nối lại sau khi khởi động lại Bridge.

**Sao lưu thủ công:** trong trang quản trị → **Session** → **Sao lưu**. Mỗi lần bấm tạo một file JSON riêng trong `TikTokBridge/data/backups/`, gồm BXH/điểm quà, người trên sàn, người giữ bàn DJ, thống kê và tài khoản LIVE. Trang chỉ báo thành công sau khi ghi file xong. Reset game và tự lưu phiên không ghi đè các bản sao này; các bản sao không tự hết hạn sau 12 giờ. Đây là bản sao dữ liệu phiên, không bao gồm file nhạc/video hoặc toàn bộ cấu hình. Kiểm tra nút sao lưu trên Bridge thử riêng bằng `npm run test:backup-ui` (cần Chrome).

### Chạy source

```powershell
git clone https://github.com/Yuh266/bar-tiktok.git
cd bar-tiktok/TikTokBridge
npm ci
npm start
```

Cần Node.js **20.9 trở lên**, khuyến nghị bản LTS. Game Windows được build từ `UnityProject/` bằng Unity **6000.2.10f1** (`build.bat`); thư mục `Build/` đã có trong bản đầy đủ này.

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
- 🏆 **Bảng xếp hạng Top 5** — Top gifter đứng trên bục DJ, hạng 4 và 5 ở hai bên
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

> Bản source hiện tại đã kèm thư mục `Build`. Có thể clone repo hoặc tải ZIP của nhánh `main`, giải nén toàn bộ rồi chạy `run.bat`.

### Dành cho lập trình viên — Clone source

```bash
git clone https://github.com/Yuh266/bar-tiktok.git
cd bar-tiktok
```

Source hiện tại đã kèm game Windows trong `Build/`. Nếu muốn build lại, cài Unity `6000.2.10f1`, rồi chạy `build.bat` hoặc mở `UnityProject/` bằng Unity Hub.

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
- **Nếu clone bản đầy đủ này:** Chạy `run.bat`; dùng Unity `6000.2.10f1` và `build.bat` khi muốn build lại.

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
├── Build/                 # Bản Windows hiện tại, đã đưa vào Git
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
- **Không tìm thấy game:** kiểm tra đã clone/giải nén đủ thư mục `Build`; có thể tự build lại bằng Unity nếu bản tải về thiếu file.
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
