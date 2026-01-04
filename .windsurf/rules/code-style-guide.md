---
trigger: always_on
---


1. Code Completeness
- Luôn cung cấp code đầy đủ, không được rút gọn, không viết sơ sài vì “code dài”.
- Nếu output vượt quá giới hạn, phải chia thành nhiều phần và tiếp tục cho đến khi hoàn chỉnh.
- Không tự ý lược bỏ logic quan trọng.

2. Documentation Rules
- Không tạo tài liệu (doc, markdown, ghi chú, mô tả dài dòng) trừ khi tôi yêu cầu rõ ràng.
- Không tự sinh file hướng dẫn, file bổ trợ hay bất kỳ tài liệu nào sau khi hoàn tất.

3. UI/UX Consistency
- Không được thay đổi UI, theme, màu sắc, layout, style, naming hay component structure của hệ thống hiện có.
- Nếu cần thêm UI mới, phải tuân theo phong cách UI đã có và hỏi lại ngay trước khi làm.

4. Database Consistency
- Phải luôn bám sát database schema (tôi sẽ lưu schema trong 1 file .md).
- Khi logic liên quan database có rủi ro mơ hồ, phải hỏi lại.
- Không được tự ý thêm/sửa/xóa bảng, field, quan hệ nếu chưa xác nhận.

5. Error Handling & Clarification
- Nếu gặp thiếu thông tin, rủi ro sai, xung đột logic hoặc nghi ngờ yêu cầu → phải báo ngay lập tức và yêu cầu xác nhận.
- Không được tự giả định theo hướng có thể gây sai lệch.

6. Safety & Reliability
- Kiểm tra code trước khi trả về: tránh lỗi cú pháp, lỗi compile, lỗi runtime rõ ràng.
- Nếu code phụ thuộc môi trường hoặc framework, cần nêu rõ preconditions.

7. Output Format
- Ưu tiên trả lời ngắn gọn, đúng trọng tâm khi giải thích.
- Code luôn đặt trong block rõ ràng.
- Không tự chia nhỏ câu trả lời thành quá nhiều phần trừ khi cần để tránh cắt nội dung.

8. Behavior
- Tránh nói vòng vo, không lặp lại yêu cầu của tôi trừ khi thật sự cần để xác nhận.
- Không tự ý thay đổi chiến lược phát triển, phương pháp, thư viện hoặc kiến trúc nếu chưa được yêu cầu.
# === BACKEND OPTIMIZATION RULES ===

9. Coding Architecture & Structure
- Tuân thủ kiến trúc backend hiện có (ví dụ: Clean Architecture, Onion, Layered hoặc mặc định của project).
- Không tự ý thay đổi hoặc tái cấu trúc project trừ khi tôi yêu cầu.
- Mọi logic phải đặt đúng layer: controller không chứa business logic; service xử lý nghiệp vụ; repository thực hiện truy vấn database.
- Không được viết code "shortcut" xử lý trực tiếp DB trong controller.

10. API Design
- API phải rõ ràng, nhất quán với API naming conventions hiện tại.
- Không được tự thay đổi URL patterns, versioning hoặc response format.
- Khi thêm API mới, phải sử dụng response model đúng chuẩn của project (Success/Failure format, envelope, pagination…).
- Validate input đầy đủ, không bỏ qua validation.

11. Error Handling
- Không được nuốt lỗi (no silent catch).
- Luôn dùng exception handling thống nhất với project (middleware, filter hoặc error handler đã dùng).
- Khi trả lỗi API, phải sử dụng format lỗi chuẩn của hệ thống.
- Nếu exception có thể ảnh hưởng dữ liệu hoặc gây nghi ngờ → báo lại ngay.

12. Database & Query Rules
- Phải bám sát schema trong file .md (không tự thêm/sửa/xóa bảng hoặc field).
- Không dùng raw SQL nếu project sử dụng ORM (EF Core, Dapper, Prisma…) trừ khi tôi yêu cầu.
- Tối ưu truy vấn: tránh N+1, tránh query lồng nhau không cần thiết.
- Khi dự đoán truy vấn có độ nặng → cần cảnh báo.
- Không được tự tạo migration.

13. Performance Best Practices
- Tránh logic dư thừa, truy vấn lặp lại.
- Luôn nghĩ đến caching nếu dữ liệu ít thay đổi (nhưng chỉ gợi ý, không tự implement).
- Không tạo vòng lặp xử lý nặng trong controller.
- Hạn chế synchronous blocking trong môi trường async.

14. Security & Safety
- Không log dữ liệu nhạy cảm.
- Sử dụng validation và sanitation với input từ client.
- Tuân theo security conventions của nền tảng đang dùng (CORS, JWT, OAuth, RBAC…).
- Nếu việc implement có risk liên quan security → phải báo ngay.

15. Dependency Management
- Không thêm package/library mới trừ khi tôi yêu cầu.
- Nếu thiếu dependency cần thiết, phải hỏi trước khi thêm.

16. Code Quality
- Code phải dễ đọc, có comment ở phần phức tạp.
- Sử dụng naming convention đúng style của project.
- Không để logic hardcode trừ khi tôi yêu cầu.

17. Testing (nếu có)
- Khi viết test, sử dụng test convention của project.
- Không tạo test framework mới.
