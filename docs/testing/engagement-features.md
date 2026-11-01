# Kiểm tra tính năng tương tác

Các kiểm tra đã thực hiện cho bản Bar Club LIVE trong `Yuh266/bar-tiktok`:

- `npm test`: 51 kiểm tra đạt, gồm module và kết nối WebSocket thực với một Bridge thử nghiệm riêng.
- Mục Đổi sàn: chọn/lưu đủ bốn mẫu, hiển thị Đang dùng, ảnh mẫu tải được và không tràn ngang ở 390px. Sàn LED ô vuông cổ điển dùng lại shader gốc; không thêm lựa chọn thứ tư vào luật bình chọn 1/2/3.
- Kết thúc đấu đội: chốt danh sách người thắng, xóa màu đội cho mọi người (kể cả khi hòa), dùng danh sách đã chốt để trao phóng to/huy hiệu/vòng vàng và pháo hoa trong 12 giây.
- Quản trị: chỉ client quản trị được reset BXH/kick. Reset giữ người chơi và tổng quà thống kê; quà tiếp theo bắt đầu điểm BXH mới. Kick giữ điểm quà, không bị chat/like thông thường đưa trở lại; lệnh vào sàn cho phép vào lại. Trạng thái được kiểm tra qua khởi động lại Bridge.
- `npm run test:moderation-ui -- http://127.0.0.1:3100`: tìm người, hủy/xác nhận reset, kick và vào lại; không tràn ngang ở 390px, không có lỗi JavaScript.
- Chat TikTok: kiểm tra bằng encode/decode schema `WebcastChatMessage` v3 thực của thư viện đang cài; nội dung nằm ở `content` vẫn được nhận, đồng thời giữ tương thích `comment` cũ. Chat `xanh` qua Bridge thực tạo thành viên đội Xanh, `hey` tạo lệnh vào sàn.
- Mốc 100 tim: đọc `count/total` của TikTok v3 và giữ `likeCount/totalLikeCount` cũ. Encode/decode schema `WebcastLikeMessage` thực xác nhận gói 99 rồi 1 kích hoạt `grow` 8 giây; gói 0 không tự cộng tim, tổng tim cả phòng không cộng vào riêng một người. Kiểm tra qua Bridge thật xác nhận người chưa vào sàn xuất hiện và phóng to khi đủ 100, đủ 100 tiếp theo kích hoạt lại, không cộng điểm quà vào BXH.
- Tự chạy: chờ 15 giây khi bật, nghỉ ngẫu nhiên giữa các vòng, trộn đủ ba loại, không lặp liên tiếp, không chồng vòng hoặc bỏ qua kết quả; tạm dừng không cắt vòng đang chơi, cài đặt được lưu qua lần khởi động lại.
- Đấu đội: khóa đội đã chọn, giới hạn 300 tim/người/vòng, tự kết thúc và công bố kết quả; điểm quà không cộng vào điểm đội.
- Bình chọn: mỗi người một phiếu, hết giờ tự chọn sàn, xử lý hòa phiếu.
- Cùng nhảy: bỏ qua chat trước hiệu lệnh và chat lặp; xét số người duy nhất, cả trường hợp đủ/thiếu người.
- Năng lượng: chỉ tính tim, giữ phần dư, mở hiệu ứng 10 giây.
- Khách quen: đếm ngày Việt Nam, không tính lặp trong ngày, đọc lại từ file, bỏ qua tài khoản demo.
- Phiên LIVE: khôi phục điểm tặng quà sau khi khởi động lại Bridge, giữ cài đặt sàn và mốc tim.
- Giọng cảm ơn: gộp quà, đọc tuần tự, chỉ một tab được phát, không đọc lại quà từ snapshot.
- Chống spam quà: cùng người và cùng quà chặn lặp cảm ơn/zoom dưới 1 giây; các lần bị chặn không kéo dài thời gian chờ. Đổi quà được kích hoạt ngay, đổi qua lại vẫn được, người tặng khác hoạt động độc lập. Bridge vẫn phát đầy đủ sự kiện quà để cộng đủ giá trị/BXH và gửi cờ cho Unity bỏ zoom lặp.
- `npm run test:speech-ui -- http://127.0.0.1:3100`: mặc định tự bật, không giành tiếng khi mở tab khác, tự nhận lại khi tab phát đóng hoặc mất kết nối; nhớ lựa chọn tắt qua tải lại trang. Mô phỏng trình duyệt chặn tiếng, giữ câu đang chờ và phát lại sau thao tác thật trên trang.
- Bot nền giới hạn 5, không trừ theo số người xem thật; xác nhận runtime `real=0 npc=5` với Bridge thử nghiệm riêng. Bản đang chạy được cập nhật mà không reset BXH.
- TikFinity: bỏ qua quà streak chưa kết thúc và bỏ qua event trùng ID.
- `npm run test:ui -- http://127.0.0.1:3100`: kiểm tra nút hoạt động, đổi sàn, mốc tim, bật/tắt giọng đọc, không tràn ngang ở màn hình 390px; không có lỗi JavaScript.
- Trên máy kiểm tra có giọng `Microsoft An (vi-VN)`; câu đọc thử kết thúc thành công qua sự kiện `SpeechSynthesisUtterance.end`.
- Runtime C# biên dịch thành công với các assembly Unity 6000.2.10f1 của bản Mono sẵn có. Máy kiểm tra không cài Unity Editor, nên chưa thực hiện một lượt build Unity Editor sạch.
- Đã chạy game và chụp ba mẫu sàn cùng HUD. Các ảnh dùng dữ liệu giả có tiền tố `Test`, không phải người xem LIVE thật.
- Kiểm tra trực tiếp runtime với 8 người giả: kick còn 7 người; reset BXH giữ 8 người và 0 người ở bục Top; vòng thắng có đúng 4 huy hiệu, mọi tên trở về màu thường; sau 12 giây không còn huy hiệu thưởng.

## Ảnh kiểm tra

- [Trang quản trị](../media/engagement-control.png)
- [Đấu đội và sàn Neon](../media/engagement-neon.png)
- [Bình chọn và sàn Disco](../media/engagement-disco.png)
- [Thử thách nhảy và sàn Dung nham](../media/engagement-lava.png)
- [Trang quản lý người chơi và BXH](../media/moderation-control.png)
- [Phần thưởng và chúc mừng đội thắng](../media/team-victory.png)
- [Trang chọn bốn mẫu sàn](../media/floor-control.png)
- [Sàn LED ô vuông cổ điển được giữ lại](../media/engagement-classic.png)

Giọng đọc phát từ trình duyệt, cần giữ tab phát mở và thu âm thanh máy tính trong phần mềm LIVE. Việc có giọng tiếng Việt phụ thuộc hệ điều hành/trình duyệt; bảng quản trị hiển thị danh sách giọng đang có.
