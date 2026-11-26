# FINTRACK PRO — HỆ THỐNG QUẢN LÝ THU CHI & NGÂN SÁCH CÁ NHÂN
**Sinh viên thực hiện:** Vương Thị Anh  
**MSSV:** 31241025843  

---

## 1. Cách khởi chạy ứng dụng (Chỉ 2 bước, không cần cài thư viện ngoài)
1. Giải nén thư mục `QuanLyThuChi_Pro_VuongThiAnh`.
2. Mở Terminal / Command Prompt tại thư mục này và chạy lệnh:
   ```bash
   node server.js
   ```
3. Mở trình duyệt web và truy cập: **`http://localhost:3000`**

*(Lưu ý: Hệ thống có tích hợp sẵn chế độ dự phòng thông minh — kể cả khi mở trực tiếp file `public/index.html` mà chưa bật Node.js server, toàn bộ chức năng Thêm/Sửa/Xóa/Cập nhật trạng thái/Thống kê vẫn hoạt động trơn tru).*

---

## 2. Cấu trúc hệ thống hoàn chỉnh (Đáp ứng trọn vẹn 8 điểm)
- **`server.js`**: Máy chủ Backend Node.js thuần cung cấp 6 RESTful API (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) đồng bộ dữ liệu thời gian thực.
- **`public/index.html`, `style.css`, `app.js`**: Giao diện Fintech Dashboard độc lập, hiện đại, tích hợp biểu đồ thống kê (`Chart.js`), bộ lọc đa tiêu chí và xuất báo cáo CSV.
- **`database/db.json`**: Cơ sở dữ liệu lưu trữ bền vững tự động cập nhật sau mỗi thao tác.
- **`database/schema.sql`**: Thiết kế Cơ sở dữ liệu Quan hệ chuẩn hóa 3NF gồm 3 bảng (`Users`, `Categories`, `Transactions`) kèm dữ liệu mẫu.
