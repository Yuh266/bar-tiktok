# Đoàn vịt và người xem

Mỗi lượt có đúng hai vịt: một dẫn đầu, một chốt đuôi. `PlayerManager.PickParadeViewers` chọn ngẫu nhiên 3–8 người xem đang trên sàn, không trùng nhau; phòng ít người dùng số người có sẵn. Không chọn bot hoặc người đang giữ bàn DJ. Không có người đủ điều kiện thì đợi 10 giây kiểm tra lại.

Các nhân vật thật nối đuôi trên đường elip trong vùng sàn trống phía dưới khán giả trong 6 giây. Đường nằm ở Z 5,6–9,2, tách khỏi hàng khán giả có Z tối đa 3,75; camera bám phạm vi cả đoàn và lấy gần hơn khi ít người. Đường được chia theo độ dài để giữ tốc độ và khoảng cách đều. Chọn ngẫu nhiên chiều đi và điểm bắt đầu mỗi lượt. Lần đầu xuất hiện sau 20–35 giây; các lượt sau nghỉ 45–90 giây.

Camera giữ góc rộng theo kích thước đường đi và tỷ lệ khung hình. Zoom quà và chào người mới không ngắt góc rộng khi đoàn đang đi. Hết lượt trả người về vị trí sàn/bục theo thứ hạng hiện tại rồi trả camera về chế độ thường. Người lên bàn DJ giữa lượt rời đoàn ngay; người bị kick được gỡ khỏi đoàn. Reset, tắt hiệu ứng hoặc mất toàn bộ người tham gia đều dọn vịt và trả camera.

Kiểm tra ngày 02/11/2026:

- Biên dịch toàn bộ script runtime bằng Roslyn 4.12 và thư viện Unity của bản game hiện có; không lỗi. Cảnh báo CS0649 có sẵn về `ClientMessage.giftName`.
- Chạy harness riêng trong bản game thử với cổng 3136, không gửi sự kiện giả vào phiên LIVE thật.
- Kiểm tra phòng không có người xem, người xem duy nhất, lựa chọn 3–8 người không trùng, đúng hai vịt, không chọn bot và không kéo người giữ bàn DJ xuống.
- Kiểm tra người thật di chuyển, thứ tự vịt đầu/người/vịt cuối có khoảng cách, thay đổi BXH và focus quà không kéo người khỏi đoàn hoặc camera khỏi góc rộng.
- Kiểm tra người lên bàn DJ mới, kick, tắt hiệu ứng và reset giữa lượt không để lại nhân vật theo đoàn hoặc camera bị khóa.
- Chạy đủ 22 giây với 8 người; đo tọa độ viewport ở nhiều vị trí quanh vòng: đủ 8 người và hai vịt luôn trong khung hình. Kết thúc tự động trả toàn bộ người và camera. Kết quả `PARADE_ALL_PASSED`.
- Ảnh bản thử: `docs/media/duck-viewer-parade.png`. Mã harness ở `C:/tmp/barclub-parade/ParadeRegression.cs`; không đưa harness vào DLL chạy thật.

Cập nhật thời gian theo yêu cầu: đi đủ vòng trong 6 giây và tăng tốc chuyển sang góc rộng. Harness `ParadeSpeedRegression.cs` xác nhận đủ 8 người và hai vịt vẫn ở vùng sàn trống phía dưới, không ra ngoài khung hình, tự kết thúc đúng 6 giây và trả người/camera về trạng thái thường: `PARADE_SPEED_ALL_PASSED`.

Điều chỉnh camera gần hơn: lấy khung theo phạm vi các thành viên trong đoàn, giảm khoảng đệm và khoảng cách tối thiểu thay vì luôn lấy toàn khu vực sàn. Đã kiểm tra cả 3 và 8 người đi hết vòng 6 giây, đủ thành viên trong khung hình, camera trở về bình thường. Ảnh: `C:/tmp/barclub-parade/parade-close-three.png` và `parade-close-eight.png`.
