# ISTQB Study Space

Web ôn tập tĩnh: React + TypeScript + Vite, chạy trên GitHub Pages. Câu hỏi được tải trực tiếp từ Google Sheets khi sử dụng; không có backend, Apps Script hay database server.

## Chạy local

Cần Node.js 22.12 trở lên (khuyến nghị Node 24 LTS) và npm.

```powershell
npm ci
Copy-Item .env.example .env.local
# Sửa .env.local theo hướng dẫn bên dưới
npm run dev
```

Mở URL Vite in ra (thường `http://127.0.0.1:5173`). Nếu chưa cấu hình key, bấm **Trải nghiệm dữ liệu mẫu** để dùng hai câu mẫu có nhãn rõ ràng. Không tự thay nguồn thật bằng mẫu khi kết nối lỗi.

```powershell
npm test
npm run build
npm run preview
```

Kiểm thử trình duyệt mobile (cài Chromium một lần):

```powershell
npx playwright install chromium
npm run test:e2e
```

Unit test kiểm tra parser/song ngữ, ID trùng, tính điểm, revision và shuffle. E2E kiểm tra dữ liệu mẫu, lưu sau khi trả lời, refresh, kết quả và ôn sai; không thay thế kiểm tra API live với key thật.

Kiểm tra dependency bằng `npm audit` trước khi cập nhật/phát hành. Tại thời điểm triển khai, phiên bản mới nhất đã cài vẫn có advisory mức high ở dependency phát triển `picomatch` và các gói kéo theo; không chạy `npm audit fix --force` tùy tiện để hạ phiên bản công cụ. Kiểm tra riêng dependency runtime bằng `npm audit --omit=dev`. Bản build Pages chỉ phục vụ tài nguyên tĩnh, không chạy dev server.

`preview` xem bản build local, không phải hosting production. Sau khi thay `.env.local`, khởi động lại Vite; cấu hình production được đưa vào lúc build.

## 1. Chuẩn bị Google Sheets

Nguồn mặc định:
https://docs.google.com/spreadsheets/d/1yBe0N4PZ0aECYvzEjGCc1oiGxvCIqAqDilA1KZ40gX4/edit

1. Mở Sheet → **Share / Chia sẻ**.
2. **General access / Quyền truy cập chung** → **Anyone with the link / Bất kỳ ai có đường liên kết** → **Viewer / Người xem**.
3. Không cần Publish to web khi dùng Sheets API. Tài khoản Workspace có thể bị quản trị viên chặn chia sẻ công khai.
4. Mỗi tab là một chương. Tab hidden hoặc tên bắt đầu `_` sẽ không hiển thị. Tên như Chương1, Chương2 được sắp theo số; tên khác như demo vẫn xuất hiện.

Tất cả nội dung trong Sheet chia sẻ công khai có thể đọc được bởi người có link/API, kể cả tab bị ẩn trên giao diện ứng dụng. Không lưu dữ liệu riêng tư trong workbook này.

### Header chuẩn (hàng đầu)

| STT | Q | VN | Đáp án | Note |
| --- | --- | --- | --- | --- |
| 1 | Câu hỏi | A. Lựa chọn một… | B | Giải thích |

Ô VN có bốn lựa chọn, ví dụ:

```text
A. Thiết kế kiểm thử
B. Phân tích kiểm thử
C. Thực thi kiểm thử
D. Lập kế hoạch kiểm thử
```

- Header ánh xạ theo tên, có thể đổi vị trí cột; năm header trên cần tồn tại.
- Note có thể trống. Đáp án chỉ A/B/C/D, không nhập giải thích vào cột đáp án.
- Có thể thêm cột `ID` cố định. Khi không có ID, STT là định danh: không đánh số lại hoặc tái sử dụng STT của câu đã xóa. Thêm ID sau này khiến lịch sử theo STT không tự chuyển sang ID mới.
- Lựa chọn nhiều dòng được giữ nguyên. Song ngữ tách bằng dòng `===`, mỗi phần có đủ nhãn A–D; nội dung cùng nhãn được ghép lại.
- Câu không nhãn phải chuẩn hóa, ứng dụng không đoán đáp án từ Note.
- Dòng chỉ có STT được bỏ qua. Câu chưa hoàn chỉnh hoặc ID trùng được bỏ qua và báo chi tiết. Bạn có thể học bất kỳ chương nào có ít nhất một câu hợp lệ; không cần hoàn thành chương trước. Tiến độ được lưu riêng từng chương.
- Bản hiện tại chưa có cột Status: mọi dòng có câu hỏi đều được kiểm tra. Soạn nháp trong tab `_Draft`.
- Theo lần kiểm tra mẫu: Chương3 cần bổ sung cột Đáp án, đổi cột lựa chọn A thành VN; Chương4 cần header Đáp án và VN. Chủ tài liệu tự xác nhận đáp án; ứng dụng không sửa Sheet.

## 2. Lấy Google API key

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/), đăng nhập tài khoản Google.
2. Tạo hoặc chọn project riêng cho web ôn tập.
3. **APIs & Services → Library** → tìm **Google Sheets API** → **Enable**.
4. **APIs & Services → Credentials → Create credentials → API key**.
5. Mở key vừa tạo → **API restrictions → Restrict key** → chỉ chọn **Google Sheets API**.
6. **Application restrictions → Websites (HTTP referrers)**. Thêm domain được phép, ví dụ:
   - `http://127.0.0.1:5173/*` (local dev)
   - `http://127.0.0.1:4173/*` (local preview)
   - `https://TEN-TAI-KHOAN.github.io/*` (GitHub Pages)
   - Nếu dùng localhost, thêm đúng origin localhost; nếu dùng custom domain, thêm domain đó.
7. Lưu. Có thể cần chờ cấu hình được áp dụng. Nên dùng key local và production riêng.
8. Điền key local vào `.env.local`:

```dotenv
VITE_GOOGLE_SHEETS_ID=1yBe0N4PZ0aECYvzEjGCc1oiGxvCIqAqDilA1KZ40gX4
VITE_GOOGLE_API_KEY=DIEN_KEY_CUA_BAN
VITE_BASE_PATH=/
```

Không cần OAuth client, service account hay file JSON credential. Không dùng service-account private key trong web.

**API key frontend nhìn thấy được** trong JavaScript/network kể cả nhập qua GitHub Secret. Đây là key dự án cho dữ liệu công khai, không phải cơ chế bảo vệ Sheet riêng tư. Giới hạn API và website giúp giảm lạm dụng; referrer không phải xác thực người dùng. Không bật thêm API nhạy cảm cho key này. `.env.local` đã được gitignore.

## 3. Deploy GitHub Pages

1. Tạo repository GitHub, ví dụ `istqb-study`. GitHub Free dùng repository public cho Pages.
2. Đưa source và `package-lock.json` lên nhánh `main`; không đưa node_modules, dist hoặc .env.local.

```powershell
git init
git add .
git commit -m "Build ISTQB study app"
git branch -M main
git remote add origin https://github.com/TEN-TAI-KHOAN/istqb-study.git
git push -u origin main
```

3. Repo → **Settings → Secrets and variables → Actions**:
   - **Secrets**: tạo `VITE_GOOGLE_API_KEY` với key production.
   - **Variables**: `VITE_GOOGLE_SHEETS_ID` với ID Sheet (bỏ trống dùng mặc định trong source).
   - **Variables**: `VITE_BASE_PATH` tùy chọn. Workflow mặc định `/<tên-repo>/`. Nếu repo là `TEN-TAI-KHOAN.github.io` hoặc dùng custom domain tại gốc, đặt `/`.
4. **Settings → Pages → Build and deployment → Source → GitHub Actions**.
5. **Actions → Deploy GitHub Pages → Run workflow** trên main. Workflow chạy test/build rồi publish dist; lần push đầu có thể thất bại nếu chưa bật Pages, chỉ cần chạy lại sau cấu hình.
6. Mở URL trong job deploy, thường `https://TEN-TAI-KHOAN.github.io/istqb-study/`.
7. Kiểm tra bằng cửa sổ ẩn danh: tải chương, chọn đáp án, refresh câu đang làm, hoàn thành, ôn sai, làm lại và mở lại URL `#/learn/...`.

Hash routing tránh 404 khi refresh trang học trên Pages. Mỗi push main tiếp theo tự kiểm tra và deploy lại. Chưa có repository/key thật nên code trong thư mục này chưa được publish và chưa kiểm chứng kết nối API live bằng key của bạn.

## 4. Cập nhật nội dung không deploy

- Thêm tab đúng header, nhập câu có STT/ID mới; đổi tên `_Template` thành tên chương khi sẵn sàng.
- Bấm **Cập nhật nội dung** trên web để lấy metadata và nội dung mới. Khi mở trang, cache quá 5 phút được tải lại.
- Không cần push GitHub nếu chỉ sửa Sheet. Thay code, key hoặc cấu hình build cần deploy.
- Lượt đang học dùng bản snapshot đã lưu, không bị sửa giữa chừng. Bắt đầu lượt mới dùng nội dung mới nhất đã tải.
- Lịch sử câu sai gắn phiên bản câu hỏi/lựa chọn/đáp án; sửa Note không reset trạng thái học.
- Không gọi API theo từng câu. Các range được chia trang theo kích thước grid; workbook rất lớn sẽ tốn thêm thời gian/quota, nên xóa bớt các dòng trống dư nếu không cần.

## 5. Tiến độ, cache và giới hạn

- Lưu trên trình duyệt theo spreadsheet ID, không đồng bộ thiết bị. Xóa dữ liệu website sẽ mất tiến độ.
- Không có đăng nhập, khóa đề thi, thu thập điểm tập trung hoặc backend.
- Ôn sai dựa trên lần trả lời gần nhất của phiên bản hiện tại. Điểm lượt ôn không cộng vào lượt toàn chương.
- Cache chỉ ghi khi toàn bộ catalog tải về hợp lệ; bản lỗi không thay cache tốt. Nếu mất mạng mà từng tải thành công sẽ dùng cache, có nhãn thời điểm. Lần đầu không có cache thì cần mạng.
- Không có service worker nên không cam kết mở app offline từ lần truy cập mới.
- Font dùng Google Fonts; nếu không tải được sẽ dùng sans-serif hệ thống.

## 6. Xử lý lỗi thường gặp

| Hiện tượng | Kiểm tra |
| --- | --- |
| Chỉ có nút dữ liệu mẫu | Key trống; sửa env rồi restart/build lại |
| HTTP 401/403 | Sheets API đã enable? Sheet đã share Viewer công khai? Key đúng API và referrer đúng origin? |
| HTTP 400 | ID Sheet/range hoặc key sai; kiểm tra cấu hình, không đăng key lên issue |
| HTTP 429 | Quota; chờ rồi thử lại, không refresh liên tục |
| Chương báo thiếu cột | Dùng đúng header STT/Q/VN/Đáp án/Note |
| Dòng báo không đủ lựa chọn | Chuẩn hóa nhãn A–D; không tách lựa chọn chỉ bằng dòng trống |
| Trang trắng/asset 404 trên Pages | VITE_BASE_PATH đúng tên repo; root/custom domain dùng `/`; chạy lại workflow |
| Sheet đã sửa mà chưa thấy | Cập nhật nội dung; lượt dở giữ snapshot nên cần bắt đầu lượt mới |
| Tiến độ không lưu | Kiểm tra quyền storage, chế độ riêng tư và dung lượng; app báo khi lưu thất bại |

## Tham khảo

- [Vite: deploy GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages)
- [Google: credentials và public data](https://developers.google.com/workspace/guides/create-credentials)
- [Giới hạn API key](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys)
- [Quota Sheets API](https://developers.google.com/workspace/sheets/api/limits)
