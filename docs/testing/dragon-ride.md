# Cưỡi rồng với quà Finger Heart

Theo lựa chọn của người dùng, kích hoạt bằng quà 5 xu. Dùng Finger Heart / Trái tim ngón tay, ID 5487, giá 5 xu đã có trong danh mục và dữ liệu quà thật của dự án. Master Rules và luật dự phòng theo tên đều dùng action `dragon`; giữ nguyên toàn bộ điểm quà/combo. Không kích hoạt tự động.

Rồng 3D tạo bằng mesh và vật liệu có sẵn: thân ngọc xanh, cánh tím hai mặt, sừng/móng vàng, yên cưỡi và đuôi chia đốt chuyển động. Người tặng được gắn vào yên, cất cánh 0,6 giây, bay một vòng trong 3,8 giây rồi hạ xuống 0,6 giây. Mặc định tổng 5 giây; thời lượng luật quà điều khiển chuyến bay trong giới hạn 5–300 giây. Camera theo toàn bộ rồng và người cưỡi.

Không chọn bot hoặc người giữ bàn DJ. Xếp tối đa 8 người chờ khác nhau; quà lặp của người đang bay/chờ và combo đã chặn trình diễn không tạo lượt trùng. Nếu đang có đoàn vịt thì chờ hết đoàn; đoàn vịt cũng chờ khi đang có rồng. Hết chuyến trả về vị trí xếp hạng mới nhất. Kick, reset, tắt hiệu ứng hoặc người cưỡi lên giữ bàn DJ đều dọn chuyến bay và camera.

Kiểm tra ngày 02/11/2026:

- `npm test`: 74/74 bài qua. Đã kiểm tra ID 5487 vẫn kích hoạt khi nguồn chỉ gửi tên Gift, alias tiếng Việt, combo vẫn tính đủ điểm, thẻ hướng dẫn có giá 5 xu và icon đúng, sự kiện Bridge gửi action dragon và không thay ghế DJ.
- Biên dịch toàn bộ script runtime bằng Roslyn 4.12 với thư viện Unity của bản game. Không lỗi; chỉ có cảnh báo CS0649 có sẵn về `ClientMessage.giftName`.
- Bản game thử độc lập tại cổng 3136: không tự bay, nhận quà thì người thật lên yên, chuyển động cánh/đuôi, khung hình chứa rồng, thứ hạng và zoom quà không làm rơi người cưỡi, không kéo người giữ DJ xuống.
- Kiểm tra xếp lượt, chống lặp và combo, chạy đủ 20 giây, chuyển lượt kế tiếp, người cưỡi lên giữ DJ, kick, chờ đoàn vịt, tắt hiệu ứng và reset. Kiểm tra cấu hình 6 giây hạ cánh đúng hạn. Kết quả `DRAGON_ALL_PASSED`.
- Ảnh: `docs/media/dragon-ride.png`. Harness ở `C:/tmp/barclub-dragon/DragonRegression.cs`, không đưa vào DLL chạy thật.

Cập nhật thời gian theo yêu cầu: mặc định 5 giây, gồm 0,6 giây cất cánh, 3,8 giây bay đủ vòng, 0,6 giây hạ cánh. Tăng tốc quay hướng, đập cánh và camera theo rồng. `npm test` vẫn qua 74/74; harness `DragonSpeedRegression.cs` xác nhận đường bay nhanh vẫn nằm trong khung hình, kết thúc đúng 5 giây và lượt kế tiếp cũng kết thúc đúng hạn: `DRAGON_SPEED_ALL_PASSED`.
