# Kiểm tra Top 5 trên sân khấu

Ngày kiểm tra: 02/11/2026.

- Biên dịch toàn bộ script runtime thành `Assembly-CSharp.dll` bằng Roslyn 4.12, tham chiếu các thư viện Unity của bản game hiện có. Không có lỗi biên dịch; có cảnh báo CS0649 sẵn có về `ClientMessage.giftName`.
- Chạy game Unity với WebSocket thử nghiệm riêng tại cổng 3135, không gửi dữ liệu thử vào Bridge đang LIVE.
- Sáu người có điểm lần lượt 600/500/400/300/200/100: năm người đầu nhận nhãn Top 1–5, người thứ sáu ở sàn thường. Bot có điểm 9999 không được chọn vào Top.
- Người hạng 2 rời sàn: người hạng cũ 3/4/5/6 lên hạng 2/3/4/5; vẫn có đủ năm người được xếp hạng.
- Người hạng 2 quay lại: năm vị trí trở về thứ tự ban đầu, người thứ sáu ra khỏi Top.
- Reset BXH: không còn nhân vật được xếp hạng, sáu người xem vẫn còn trên sàn.
- Kiểm tra ảnh chụp 540 × 960: sân khấu có thứ tự trái sang phải 4–2–1–3–5; bảng quà hiển thị đủ năm dòng, thẻ hướng dẫn quà nằm phía dưới và không chồng lên bảng.

Bản runtime đã được cập nhật vào `Build/BarClub_Live_Data/Managed/Assembly-CSharp.dll`. Khi build lại bằng Unity, dùng source trong `UnityProject/Assets/Scripts/`.
