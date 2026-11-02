# Ghế DJ của quà Electro Vibes

Người gửi Electro Vibes (ID 166583, 349 xu; tên Việt Electro mãi đỉnh) lên giữa bàn DJ, không cần lọt Top 5. Vị trí được giữ không giới hạn thời gian. Hiệu ứng camera/pháo hoa vẫn chạy theo thời lượng cấu hình.

Chỉ người khác gửi cùng quà Electro Vibes mới thay chỗ. Người cũ trở về sàn hoặc bục xếp hạng hiện tại. Quà khác và reset BXH không thay ghế. Ghế được lưu cùng phiên LIVE, khôi phục khi game kết nối lại hoặc Bridge khởi động lại trong thời hạn lưu phiên. Reset game hoặc quản trị kick người đang giữ ghế sẽ xóa ghế.

Kiểm tra ngày 02/11/2026:

- `npm test`: 70/70 bài kiểm tra qua. Có kiểm tra quà theo ID/tên Việt, đổi người giữ ghế, sự kiện combo bị chặn, bảo vệ người đang giữ ghế khỏi dọn người không hoạt động và giới hạn số người.
- Kiểm tra Bridge riêng: gửi Electro A, quà khác B, kết nối lại, Electro B, reset BXH, khởi động lại Bridge và kick B. Ghế được truyền đúng trong sự kiện, snapshot, danh sách sàn và file lưu phiên.
- Biên dịch toàn bộ script Unity bằng Roslyn 4.12 với các thư viện bản game hiện có. Chỉ có cảnh báo CS0649 có sẵn về `ClientMessage.giftName`.
- Bản game thử riêng chạy tại cổng 3136 với harness kiểm tra trạng thái: người thứ sáu ngoài Top 5 lên bàn DJ; camera và cập nhật hạng không kéo xuống; vẫn đứng sau hiệu ứng 12 giây và quà khác; Electro mới thay người cũ; kết nối lại và reset BXH giữ ghế. Kết quả `TOPDJ_ALL_PASSED`.
- Ảnh kiểm tra bàn DJ: `C:/tmp/barclub-topdj/guest.png` và `C:/tmp/barclub-topdj/permanent.png`. Harness thử không được đưa vào DLL sử dụng thật.
