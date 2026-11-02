STUDYSPACE BLOOM — GÓI TRIỂN KHAI

CẤU TRÚC GÓI
- index.html: trang vào chính cho GitHub Pages hoặc máy chủ tĩnh.
- styles.css: stylesheet nền hiện hữu của ứng dụng.
- brand.css: lớp nhận diện mới cho logo, favicon, thanh bên, thanh công cụ và hình Olympia; phải được nạp sau styles.css.
- app.js: logic ứng dụng.
- assets/: favicon và 5 hình ảnh được tối ưu từ bộ ảnh người dùng cung cấp.
- TEST_REPORT.txt: kết quả rà soát tĩnh và giới hạn kiểm thử.

CÁCH TRIỂN KHAI GITHUB PAGES
1. Từ website hiện tại, xuất một bản sao lưu JSON và giữ tệp đó ở nơi riêng.
2. Giải nén gói này.
3. Tải lên đồng thời index.html, styles.css, brand.css, app.js và toàn bộ thư mục assets/ vào đúng thư mục đang phục vụ website.
4. Giữ nguyên tên tệp, tên thư mục và thứ tự nạp CSS trong index.html: styles.css trước, brand.css sau.
5. Commit/push và chờ GitHub Pages hoàn tất triển khai.
6. Mở lại website bằng Ctrl+Shift+R. Nếu biểu tượng cũ còn lưu cache, đóng tab rồi mở lại.

LƯU Ý DỮ LIỆU
- Giữ nguyên origin hiện tại (tên miền và đường dẫn website).
- Không xóa Site data, IndexedDB hoặc Local Storage của website.
- Không chuyển sang mở index.html bằng file://; tiếp tục dùng cùng GitHub Pages origin.
- Sau khi triển khai, thử tạo/sửa một trang vở và một dự án nhỏ; tải lại trang để xác nhận dữ liệu vẫn được lưu.

THIẾT KẾ / THAO TÁC
- Thanh công cụ trên cùng dùng một capsule thống nhất; tìm kiếm tách riêng để giữ chiều rộng hợp lý.
- Nhóm không gian, menu công cụ, trạng thái lưu, Command Center, Focus và chuyển sáng/tối được giữ nguyên.
- Trên màn hình hẹp, thanh công cụ có thể cuộn ngang bên trong; nút mở thanh bên vẫn xuất hiện.
- Thanh bên desktop có thể thu gọn/mở rộng; trên mobile chuyển thành ngăn kéo có lớp nền phủ.
- Giao diện ưu tiên tông xanh navy – xanh sáng – vàng, đồng bộ với bộ nhận diện hình ảnh.
- Chuyển động nhẹ và tôn trọng prefers-reduced-motion.

BỘ NHẬN DIỆN HÌNH ẢNH
- assets/brand-emblem.webp: biểu trưng dùng trong thanh bên.
- assets/favicon.ico và assets/favicon-192.png: favicon cục bộ.
- assets/apple-touch-icon.png: biểu tượng khi thêm trang web vào màn hình chính trên thiết bị hỗ trợ.
- assets/studyspace-globe.webp: hình nhận diện ở khu vực chào mừng trang chủ.
- assets/olympia-banner.webp, assets/olympia-torch.webp, assets/olympia-question.webp: hình trong khu vực Olympia.
- Ảnh được đóng gói nội bộ; không cần gọi máy chủ ảnh bên ngoài để tải logo/favicon.
- Tất cả đường dẫn tài nguyên là tương đối. Vì vậy, phải tải lên thư mục assets cùng các tệp HTML/CSS/JS.

THAY ĐỔI MÃ
- CSS và JavaScript vẫn tách khỏi index.html.
- brand.css là lớp giao diện bổ sung để không trộn nhận diện mới vào stylesheet cũ.
- Không thay đổi APP_VERSION (17), schema dữ liệu hoặc thuật toán lưu trữ trong bản cập nhật này.
