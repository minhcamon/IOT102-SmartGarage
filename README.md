# 🚗 IOT102 - Smart Garage System

Dự án Hệ thống Garage thông minh được thực hiện trong khuôn khổ môn học **IOT102** tại **FPT University**. Hệ thống kết hợp giữa phần cứng (IoT), Backend xử lý dữ liệu và giao diện Web (Frontend) để giám sát và điều khiển cửa garage từ xa.

## 📁 Cấu trúc dự án

*   **`/sketch`**: Mã nguồn C++ cho vi điều khiển (ESP32/ESP8266). Quản lý cảm biến siêu âm, RFID, Servo Motor và kết nối WiFi/MQTT.
*   **`/backend`**: Mã nguồn Node.js/Express xử lý logic, nhận dữ liệu từ MQTT Broker và cung cấp API cho Frontend.
*   **`/frontend`**: Giao diện người dùng (HTML/CSS/JS) hiển thị trạng thái thực tế của garage.
*   **`/report`**: Chứa báo cáo chi tiết, sơ đồ mạch (schematic) và hình ảnh thực tế của dự án.

## ✨ Tính năng chính

- [x] **Tự động đóng/mở:** Sử dụng cảm biến khoảng cách để nhận diện xe.
- [x] **Bảo mật RFID:** Chỉ những thẻ được đăng ký mới có quyền kích hoạt mở cửa.
- [x] **Giám sát thời gian thực:** Cập nhật trạng thái cửa và khoảng cách vật cản lên Web Dashboard qua MQTT.
- [x] **Cảnh báo an toàn:** Hệ thống tự động dừng hoặc báo động khi có vật cản trong quá trình đóng cửa.

## 🛠 Công nghệ sử dụng

*   **Hardware:** ESP32, Cảm biến siêu âm HC-SR04, Module RFID RC522, Servo MG996R.
*   **Backend:** Node.js, Express, MQTT Protocol (PubSubClient).
*   **Frontend:** HTML5, Bootstrap 5, JavaScript (Socket.io/MQTT.js).
*   **Tools:** Arduino IDE, VS Code, Git.

## 📝 Thành viên thực hiện
• Nguyễn Minh - Lead Developer - minhcamon
## ⚖️ Copyright & License
Copyright © 2026 bởi Minh.
Dự án này được phát triển cho mục đích học tập tại FPT University. Vui lòng ghi rõ nguồn nếu bạn sử dụng hoặc tham khảo mã nguồn này cho các dự án cá nhân hoặc bài tập lớn.
Last updated: March 2026
