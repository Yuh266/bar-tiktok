# Tắt trò chơi và ẩn ô trong game

Trang quản trị → Tương tác → Tắt trò chơi. `games_config` lưu `gamesEnabled=false` và tắt tự chạy trong `data/engagement-settings.json`. Dừng ngay vòng đang chạy, xóa kết quả/đội và không phát thưởng kết thúc vòng. Chặn mở vòng bằng tay hoặc bật tự chạy khi trò chơi còn tắt. Trạng thái được gửi tới game qua `engagement_state` để ngừng vẽ ô trò chơi; ô năng lượng vẫn hiển thị, nhận tim và mở tiệc độc lập.

Nút đổi thành Bật trò chơi khi đã tắt. Bật lại cho phép chơi và tự chạy sau 15 giây. Các chức năng quà, BXH, đổi sàn thủ công, giọng cảm ơn và danh hiệu khách quen được giữ riêng.

Kiểm tra ngày 02/11/2026:

- `npm test`: 76/76 qua, gồm dừng trận đúng lúc hết giờ mà không tạo kết quả/thưởng, xóa đội, chặn tự/manual start, giữ tắt khi tạo lại engine và cho phép bật lại.
- `node scripts/games-toggle-ui-smoke.js`: Chrome và Bridge thử riêng. Bấm tắt khi đang đấu đội, xác nhận hết vòng ngay và nút bắt đầu bị khóa; khởi động lại Bridge vẫn tắt; bấm bật rồi mở bình chọn được; màn hình 390 px không tràn ngang.
- Runtime Unity: `GamesToggleRegression.cs` kiểm tra lúc tắt không vẽ ô kể cả khi dữ liệu hoạt động cũ còn tồn tại, bật lại vẽ được và tắt lại ẩn ngay. Kết quả `GAMES_TOGGLE_ALL_PASSED`.
- Ảnh thử: `C:/tmp/barclub-games-toggle/games-off.png`, `games-on.png`; giao diện quản trị: `docs/media/games-toggle-control.png`.

Theo điều chỉnh của người dùng, ô năng lượng được giữ độc lập với trò chơi. Like vẫn cộng năng lượng và mở tiệc khi `gamesEnabled=false`; game vẫn vẽ ô năng lượng nhưng bỏ ô đấu đội/bình chọn/cùng nhảy. `npm test` 76/76 và UI smoke qua. Runtime xác nhận năng lượng vẫn vẽ và phát tiệc khi tắt trò chơi; ảnh `C:/tmp/barclub-parade/energy-without-games.png`.
