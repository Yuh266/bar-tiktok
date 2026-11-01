# Kiểm tra tính năng tương tác

Các kiểm tra đã thực hiện cho bản Bar Club LIVE trong `Yuh266/bar-tiktok`:

- `npm test`: 43 kiểm tra đạt, gồm module và kết nối WebSocket thực với một Bridge thử nghiệm riêng.
- Chat TikTok: kiểm tra bằng encode/decode schema `WebcastChatMessage` v3 thực của thư viện đang cài; nội dung nằm ở `content` vẫn được nhận, đồng thời giữ tương thích `comment` cũ. Chat `xanh` qua Bridge thực tạo thành viên đội Xanh, `hey` tạo lệnh vào sàn.
- Tự chạy: chờ 15 giây khi bật, nghỉ ngẫu nhiên giữa các vòng, trộn đủ ba loại, không lặp liên tiếp, không chồng vòng hoặc bỏ qua kết quả; tạm dừng không cắt vòng đang chơi, cài đặt được lưu qua lần khởi động lại.
- Đấu đội: khóa đội đã chọn, giới hạn 300 tim/người/vòng, tự kết thúc và công bố kết quả; điểm quà không cộng vào điểm đội.
- Bình chọn: mỗi người một phiếu, hết giờ tự chọn sàn, xử lý hòa phiếu.
- Cùng nhảy: bỏ qua chat trước hiệu lệnh và chat lặp; xét số người duy nhất, cả trường hợp đủ/thiếu người.
- Năng lượng: chỉ tính tim, giữ phần dư, mở hiệu ứng 10 giây.
- Khách quen: đếm ngày Việt Nam, không tính lặp trong ngày, đọc lại từ file, bỏ qua tài khoản demo.
- Phiên LIVE: khôi phục điểm tặng quà sau khi khởi động lại Bridge, giữ cài đặt sàn và mốc tim.
- Giọng cảm ơn: gộp quà, đọc tuần tự, chỉ một tab được phát, không đọc lại quà từ snapshot.
- TikFinity: bỏ qua quà streak chưa kết thúc và bỏ qua event trùng ID.
- `npm run test:ui -- http://127.0.0.1:3100`: kiểm tra nút hoạt động, đổi sàn, mốc tim, bật/tắt giọng đọc, không tràn ngang ở màn hình 390px; không có lỗi JavaScript.
- Trên máy kiểm tra có giọng `Microsoft An (vi-VN)`; câu đọc thử kết thúc thành công qua sự kiện `SpeechSynthesisUtterance.end`.
- Runtime C# biên dịch thành công với các assembly Unity 6000.2.10f1 của bản Mono sẵn có. Máy kiểm tra không cài Unity Editor, nên chưa thực hiện một lượt build Unity Editor sạch.
- Đã chạy game và chụp ba mẫu sàn cùng HUD. Các ảnh dùng dữ liệu giả có tiền tố `Test`, không phải người xem LIVE thật.

## Ảnh kiểm tra

- [Trang quản trị](../media/engagement-control.png)
- [Đấu đội và sàn Neon](../media/engagement-neon.png)
- [Bình chọn và sàn Disco](../media/engagement-disco.png)
- [Thử thách nhảy và sàn Dung nham](../media/engagement-lava.png)

Giọng đọc phát từ trình duyệt, cần giữ tab phát mở và thu âm thanh máy tính trong phần mềm LIVE. Việc có giọng tiếng Việt phụ thuộc hệ điều hành/trình duyệt; bảng quản trị hiển thị danh sách giọng đang có.
