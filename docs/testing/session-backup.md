# Nút Sao lưu phiên LIVE

Trang quản trị → Session → Sao lưu. Mỗi lần bấm ghi một file JSON riêng vào `TikTokBridge/data/backups/`. Dữ liệu lấy trực tiếp từ trạng thái hiện tại của Bridge, gồm thống kê, người xem đang trên sàn, BXH quà, danh sách đã kick, tài khoản LIVE và người giữ bàn DJ. File tạm được ghi xong rồi đổi thành file JSON hoàn chỉnh trước khi báo thành công; tên có thời điểm UTC và UUID để các lần bấm không ghi đè nhau.

Trang hiển thị thời điểm theo giờ Việt Nam/Thái Lan, số người tặng, tổng xu và tên file. Nút tạm khóa khi đang ghi hoặc mất kết nối. Lỗi ghi và quá hạn chờ xác nhận được hiển thị riêng. Chỉ client đăng ký quyền control được tạo bản sao; game/overlay và client chưa đăng ký không được phép.

Các bản sao không bị reset game, tự lưu phiên hoặc giới hạn tự khôi phục phiên 12 giờ xóa đi. Không có nút phục hồi hoặc lịch sao lưu tự động trong thay đổi này. File nhạc/video và cấu hình riêng không nằm trong bản sao phiên.

Kiểm tra ngày 02/11/2026:

- `npm test`: 72/72 bài qua. Kiểm tra bản sao chứa dữ liệu mới nhất trước khi tự lưu; nhiều lần lưu có file riêng; tự lưu/reset không thay đổi bản sao; từ chối client không có quyền; báo lỗi ghi và có thể lưu lại sau khi khắc phục; giữ đúng điểm quà và ghế DJ.
- `npm run test:backup-ui`: Chrome headless với Bridge và thư mục dữ liệu riêng, không thao tác trên phiên LIVE thật. Bấm Sao lưu tạo file thật, bấm lần hai giữ đủ hai bản, thông báo đúng số liệu, bố cục 390 px không tràn ngang và nút khóa khi mất kết nối.
- Ảnh giao diện: `docs/media/session-backup-control.png`.
