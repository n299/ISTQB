# Kế hoạch dùng AI triển khai web ôn tập ISTQB

Trạng thái: bản kế hoạch để review; chưa triển khai ứng dụng và chưa sửa Google Sheets.

## 1. Mục tiêu và giới hạn

- Chỉ deploy ứng dụng lên GitHub Pages; không có backend, Worker, database server hay Apps Script.
- React + TypeScript + Vite; CSS thông thường; ưu tiên ít dependency.
- Trình duyệt đọc Google Sheets API v4 lúc sử dụng. Không tải dữ liệu vào bundle lúc build.
- Tiến độ học và cache nội dung lưu trong LocalStorage; chưa đồng bộ thiết bị.
- MVP: câu hỏi chữ, bốn lựa chọn, một đáp án đúng; giữ nguyên Việt–Anh trong nội dung.
- Có danh sách chương, làm từng câu, chấm ngay, Note, tiến độ, kết quả, học tiếp, ôn sai và làm lại đảo câu.
- Chưa làm đăng nhập, AI sinh câu hỏi, hẹn giờ, SRS, chế độ thi, service worker hoặc ảnh trong câu hỏi.

## 2. Nguồn dữ liệu đã kiểm tra

- Spreadsheet ID: `1yBe0N4PZ0aECYvzEjGCc1oiGxvCIqAqDilA1KZ40gX4`.
- URL: https://docs.google.com/spreadsheets/d/1yBe0N4PZ0aECYvzEjGCc1oiGxvCIqAqDilA1KZ40gX4/edit
- Các tab hiện có: Chương4 (`1552442117`), Chương1 (`1086499027`), Chương3 (`0`), demo (`2054941728`).
- Đã đọc metadata và A1:O5 từng tab; chưa kiểm tra toàn bộ dữ liệu của workbook mới.
- Chương1 và demo có header `STT | Q | VN | Đáp án | Note`.
- Chương3 có `STT | Q | A | Note`, chưa có cột đáp án riêng.
- Chương4 có `STT | Q | A | [trống] | Note`, cột không tên chứa đáp án ở các dòng mẫu.
- Cùng câu đầu của Chương4 và demo có đáp án khác nhau (D và C). Đây là khác biệt nội dung để chủ tài liệu xem xét, không phải yêu cầu AI tự sửa đáp án.
- Việc connector đọc được tài liệu chưa chứng minh website truy cập ẩn danh được.

## 3. Hợp đồng dữ liệu

Giữ cấu trúc hiện có của demo để hạn chế công việc chuyển đổi:

| Header | Quy tắc |
| --- | --- |
| STT | Bắt buộc, duy nhất trong tab; không đổi/không tái sử dụng khi dùng làm ID |
| Q | Câu hỏi bắt buộc có nội dung |
| VN | Bốn lựa chọn có nhãn A./B./C./D.; giữ được nội dung nhiều dòng |
| Đáp án | Một chữ A/B/C/D; bỏ khoảng trắng đầu/cuối và chuẩn hóa hoa |
| Note | Header cần có; giá trị có thể trống |
| ID | Cột bổ sung tùy chọn; khuyến nghị ID cố định khi biên tập lâu dài |

- Ánh xạ theo header, không dựa vào số thứ tự cột. Không tự hiểu cột tên `A` hoặc cột không tên là cột nào.
- Không bắt buộc đổi Sheet sang bốn cột lựa chọn riêng trong MVP.
- ID nội bộ: spreadsheetId + sheetId + (ID nếu có, nếu không dùng STT). Không dùng row index.
- Nếu thêm ID cho câu đã có lịch sử theo STT thì cần kế hoạch migrate; không âm thầm coi lịch sử cũ là của ID mới.
- Không dùng fingerprint nội dung làm ID. Fingerprint riêng để nhận diện thay đổi câu/đáp án.
- Parser cần hỗ trợ mẫu song ngữ thực tế: phân đoạn tại dòng `===`, nhận nhãn A–D/a–d và gộp nội dung cùng lựa chọn giữa các đoạn.
- Các dòng nhãn nhỏ đứng riêng như `a.` ngay trước `A. ...` là artefact định dạng; xử lý dựa trên fixture thực tế, không xóa tùy tiện nội dung.
- Câu không nhãn hoặc không tách được đúng bốn lựa chọn: báo lỗi để chủ tài liệu chuẩn hóa. Không chia mỗi dòng thành một lựa chọn và không đoán đáp án từ Note.
- Q trống và chỉ có STT: bỏ qua. Q trống nhưng có dữ liệu lựa chọn/đáp án: báo dòng chưa hoàn thiện.
- Câu có Q nhưng thiếu lựa chọn/đáp án hoặc trùng ID: không bắt đầu lượt mới của chương cho đến khi dữ liệu được sửa, hoặc người học chủ động chọn bản cache hợp lệ cũ.
- Không sửa nội dung chuyên môn, tự dịch hoặc truy cập các link trong Note để thay đổi đáp án.
- Render như văn bản, giữ xuống dòng. Nếu nhận diện URL trong Note thì chỉ cho phép http/https; không render HTML tùy ý.

## 4. Nhận diện chương

- Lấy danh sách tab từ metadata; không hard-code số chương hoặc gid.
- Bỏ tab hidden và tab bắt đầu bằng `_`. Với tab còn lại: kiểm tra header để xác định trạng thái.
- Tab đúng schema có thể học; tab sai schema xuất hiện với trạng thái chưa sẵn sàng và thông báo header thiếu.
- Vì vậy demo vẫn xuất hiện theo tên của nó; đổi tên thành `_demo` sẽ loại khỏi danh sách, không cần deploy.
- Sắp các tab tên Chương + số theo số tự nhiên; các tab tên khác xếp sau theo thứ tự trong workbook.
- Chấp nhận sheetId = 0, không kiểm tra ID theo truthy/falsy.
- Tên tab chỉ để hiển thị và tạo range. Escape apostrophe, Unicode và ký tự đặc biệt khi tạo A1 notation.
- Số câu là số câu có nội dung hợp lệ; không dùng grid rowCount hoặc STT lớn nhất.

## 5. Đọc dữ liệu và cập nhật không deploy

- Cấu hình build: `VITE_GOOGLE_SHEETS_ID`, `VITE_GOOGLE_API_KEY`; thêm `.env.example`, không điền key thật vào tài liệu.
- Thiết lập một lần: Google Cloud project, bật Sheets API, tạo key chuyên dụng và cho Sheet quyền đọc công khai bằng link.
- Key frontend là thông tin nhìn thấy được trong bundle. GitHub Actions secret không giấu được giá trị sau khi build vào JavaScript.
- Giới hạn key chỉ Google Sheets API và HTTP referrer của site; dùng key riêng cho localhost nếu cần. Không dùng service-account key.
- Trước khi chốt tích hợp, kiểm tra đọc bằng key từ trình duyệt không có phiên đăng nhập Google, gồm metadata và values. Không dùng quyền connector làm bằng chứng.
- Giai đoạn UI có thể dùng fixture khi chưa có key. Phải hiển thị rõ chế độ dữ liệu mẫu; không âm thầm thay dữ liệu thật bằng mẫu khi API lỗi.
- Lần mở đầu: lấy metadata, sau đó batchGet dữ liệu những tab cần kiểm tra. Giới hạn range dựa trên metadata, phân trang nếu cần; không cố định trần 1000 dòng và không quét cả grid một cách không giới hạn.
- Với quy mô hiện tại có thể tải các chương theo đợt để tính số câu chính xác. Không gọi API theo từng lựa chọn hoặc từng lần chuyển câu.
- Cache có schemaVersion, spreadsheetId, sheetId, fingerprint và fetchedAt. TTL gợi ý 5 phút.
- Cache còn hạn: dùng cache. Hết hạn: kiểm tra lại khi mở trang. Nút Cập nhật nội dung luôn yêu cầu tải mới, có chống bấm liên tiếp và request trùng.
- Tab mới chỉ được phát hiện khi metadata được tải lại; cập nhật metadata và nội dung cùng đợt refresh.
- Chỉ thay cache sau khi dữ liệu mới đã hợp lệ. Phân biệt API lỗi với chương hợp lệ có 0 câu.
- Retry có giới hạn/backoff cho 429, 5xx; không retry vô hạn cho 400, 401 hoặc 403. Xử lý timeout.
- Khi lỗi mạng và có cache: thông báo đang dùng bản lưu, hiện thời điểm. Lần đầu chưa có cache: báo lỗi + Thử lại.
- Bộ nhớ local đầy/bị chặn: vẫn cho học trong bộ nhớ và báo không lưu được; không làm crash app.
- Không cam kết tự cập nhật tức thì khi người học giữ nguyên trang. Nội dung đổi được lấy qua refresh theo TTL hoặc nút cập nhật.

## 6. Quy tắc phiên học

- Trang chính: tên chương, số câu, trạng thái, kết quả gần nhất, Bắt đầu/Học tiếp và Ôn câu sai nếu có.
- Lượt đầu theo STT; làm lại dùng Fisher–Yates, giữ nguyên thứ tự lựa chọn A–D.
- Với hơn một câu, nếu shuffle tạo đúng thứ tự lượt trước thì điều chỉnh để lượt mới có thứ tự khác.
- Giữ snapshot đủ nội dung của chương trong lượt học; cập nhật Sheet không đổi lượt đang làm.
- Trạng thái rõ: chưa chọn → đã chọn/hiện đáp án → câu tiếp → hoàn thành.
- Lần chọn đầu là kết quả chính thức; double-click không làm tăng điểm và không thay đáp án.
- Không tự chuyển câu. Hiện Note sau khi trả lời cả đúng lẫn sai; Note trống không hiển thị hộp rỗng.
- Tiến độ: vị trí câu hiện tại, số câu đã trả lời/tổng và đúng/sai; thanh tiến độ dựa trên số đã trả lời.
- Lưu sau mỗi lần trả lời và chuyển câu. Refresh phục hồi cả màn hình đã hiện giải thích, không nhảy qua câu.
- Hoàn thành: điểm đúng/tổng, tỷ lệ, xem lại câu đã làm, ôn câu sai, làm lại.
- Ôn sai: lấy câu có lần trả lời gần nhất là sai trong phiên bản hiện hành; làm đúng thì bỏ khỏi danh sách. Kết quả lượt ôn không ghi đè điểm toàn chương.
- Chuyển chương/thoát trang giữ lượt dở; bắt đầu lại khi có lượt dở cần xác nhận trên giao diện trước khi thay thế.
- Lịch sử và câu sai gắn fingerprint phần Q/options/answer. Khi các trường này đổi, coi câu là nội dung mới cho lượt mới. Sửa Note đơn thuần không reset kết quả.
- Chương/câu bị xóa không xuất hiện trong lượt mới; lượt dở dùng snapshot cũ và ghi rõ là bản đã lưu.

## 7. UI và cấu trúc code dự kiến

- Ba màn hình: danh sách chương, học, kết quả/xem lại.
- Dùng hash routing để refresh URL trang chương trên GitHub Pages không bị 404.
- Mobile-first; trang học riêng thay vì popup toàn bài; container rộng vừa phải trên desktop.
- Thẻ lựa chọn dễ bấm, thông báo đúng/sai có chữ và biểu tượng; không chỉ dùng màu.
- Dùng button/radio semantic, focus rõ, tương tác được bằng bàn phím; giữ khả năng zoom và không tràn ngang câu dài.
- Không đưa API key, stack trace hoặc chi tiết Google Cloud vào thông báo cho người học; hướng dẫn cấu hình đặt trong README.

Cấu trúc gợi ý, AI có thể tinh giản nhưng giữ ranh giới trách nhiệm:

```text
src/
  config.ts
  domain/           # kiểu dữ liệu, validation, shuffle, phiên học
  data/             # Sheets client, parser, cache, storage
  pages/            # danh sách, học, kết quả
  components/       # question, option, progress, feedback
  styles/
tests/              # unit/integration quan trọng, E2E
.github/workflows/  # kiểm tra và deploy GitHub Pages
.env.example
README.md
```

## 8. Chia đợt để AI gen code

Thực hiện tuần tự. Mỗi đợt phải có đầu ra chạy/kiểm tra được; hoàn thành các kiểm tra rồi mới chuyển đợt. Không yêu cầu AI tạo toàn bộ app trong một prompt.

| Đợt | Công việc cho AI | Tiêu chí hoàn thành |
| --- | --- | --- |
| 0 — Dữ liệu và truy cập | Kiểm tra toàn bộ câu hỏi/header ở Sheet mới; báo dòng cần chuẩn hóa; hướng dẫn cấu hình API; thử đọc từ browser ẩn danh khi có key | Có báo cáo dữ liệu thực tế và bằng chứng truy cập; thiếu cấu hình được ghi rõ, không tuyên bố tích hợp thành công |
| 1 — Khung và giao diện | Khởi tạo Vite React TS, hash routing, kiểu dữ liệu và ba màn hình bằng fixture sát dữ liệu thật | Chạy local/build được, chuyển màn hình được, xem tốt mobile; dữ liệu mẫu có nhãn |
| 2 — Parser và Google Sheets | Viết parser/validator, metadata discovery, batch reads, trạng thái chương, cache và nút cập nhật | Tải được Sheet thật khi đủ cấu hình; phát hiện tab mới, không sửa Sheet, tab lỗi có thông báo |
| 3 — Luồng học | Chấm, khóa đáp án, Note, tiến độ, kết quả và shuffle | Một lượt đầy đủ hoạt động; tính điểm không lặp; làm lại đủ câu, không mất/trùng |
| 4 — Lưu và ôn sai | Persistence, khôi phục snapshot, xem lại, ôn sai và reconcile nội dung mới | Refresh/đóng mở giữ tiến độ; ôn sai độc lập; thay đổi nội dung không làm sai lượt dở |
| 5 — Hoàn thiện và phát hành | Kiểm thử browser, lỗi mạng/config, tài liệu vận hành, CI và cấu hình Pages | Checks pass, preview đúng base path; chỉ publish thật sau khi người dùng yêu cầu |

Nếu thiếu key ở đợt 0, vẫn làm được UI và logic bằng fixture. Phần đọc live phải được đánh dấu chưa xác minh và là điều kiện cần trước khi nghiệm thu.

## 9. Prompt điều phối cho AI

Sao chép prompt sau cùng với file kế hoạch, thay [N] bằng đợt muốn triển khai:

> Đọc PLAN_AI.md và triển khai đợt [N]. Đây là web tĩnh React + TypeScript + Vite chỉ deploy GitHub Pages, đọc Google Sheets trực tiếp. Không thêm backend, Worker, Apps Script, database server, đăng nhập hoặc AI sinh nội dung. Dùng đúng spreadsheet ID trong plan; không sửa Sheet. Trước khi sửa code, kiểm tra repo và nêu phạm vi đợt. Thực hiện code và kiểm tra cần thiết cho đợt đó. Không hard-code danh sách chương, số câu hoặc đáp án. Không suy đáp án từ Note. Không tuyên bố dùng dữ liệu live nếu chưa kiểm chứng bằng browser với API key. Không tự commit/push/publish. Kết thúc bằng: phần đã hoàn thành, kết quả kiểm tra thực tế, giới hạn chưa xác minh và bước tiếp theo. Khi cần lựa chọn nhỏ, dùng mặc định trong plan; nếu có mâu thuẫn dữ liệu chuyên môn thì báo rõ, không tự sửa.

## 10. Kiểm tra có giá trị

- Parser: lựa chọn nhiều dòng, song ngữ/===, CRLF, dòng nhãn lặp, đáp án thiếu/sai, STT/ID trùng, dòng chỉ STT.
- Discovery: gid=0, thêm/đổi tên/xóa tab, hidden/_demo, Chương2 trước Chương10, tên tab có apostrophe.
- Scoring: click lặp, câu cuối, chương 0/1 câu, shuffle không mất/trùng, số đúng+sai bằng số đã trả lời.
- Persistence: refresh sau chọn trước khi Next, khôi phục lượt đã hoàn thành, cache JSON hỏng và storage bị chặn/đầy.
- Updates: Sheet đổi giữa lượt, sửa Note, sửa đáp án, thêm/xóa câu, trùng ID và bộ dữ liệu mới không hợp lệ.
- E2E bằng API mock có cấu trúc thật để ổn định; ít nhất một smoke test với Sheet thật không dựa trên phiên đăng nhập Google khi cấu hình cho phép.
- Không sửa Sheet thật để chạy test; dùng fixture hoặc spreadsheet thử nghiệm riêng khi cần kiểm tra thay đổi nguồn.
- GitHub Pages: asset base path, hash URL refresh, cấu hình API key cho domain deploy, mobile khoảng 390px và desktop.
- Công cụ đề xuất: Vitest cho logic/parser, React Testing Library khi cần xác minh tương tác, Playwright cho các luồng chính.
- Mỗi đợt chạy typecheck, các test liên quan và build. E2E tổng ở đợt cuối; không viết test chỉ sao chép implementation.

## 11. Deploy và hướng dẫn vận hành

- Repo GitHub, Pages source = GitHub Actions; workflow install theo lockfile, check/test/build và deploy dist.
- Cấu hình Vite base đúng tên repository; dùng hash routing cho trang con.
- API key đưa qua cấu hình build, luôn coi là public. Không in key trong log.
- README gồm: chạy local, cấu hình key/referrer, schema Sheet, thêm chương/câu, xử lý dữ liệu lỗi, cập nhật cache và giới hạn tiến độ cục bộ.
- Thay dữ liệu Sheet: không build/deploy. Thay code/cấu hình build: cần deploy.
- Quyền chia sẻ Sheet và việc publish website là thao tác riêng; kế hoạch này không tự cấp quyền hoặc publish.
- Repository/username GitHub và API key chưa được cung cấp; không tự giả định giá trị thật.

## 12. Điều kiện nghiệm thu cuối

1. Chỉ có một website được deploy trên GitHub Pages; không cần backend riêng.
2. Người chưa đăng nhập Google mở được web và tải được nội dung đã cho phép đọc công khai.
3. Chương/câu lấy từ Sheet mới; thay dữ liệu hợp lệ được thấy sau refresh nội dung mà không deploy.
4. Chọn đáp án hiển thị đúng phản hồi và Note, không cộng điểm hai lần.
5. Học tiếp, làm lại đảo câu, xem lại và ôn sai hoạt động đúng.
6. Lượt dở không đổi khi Sheet được cập nhật; bản nội dung mới áp dụng cho lượt mới.
7. Dữ liệu lỗi, mạng lỗi và storage lỗi không làm crash hoặc chấm sai âm thầm.
8. Không có key service account, token người dùng hoặc credential bí mật trong frontend/repo.
9. Browser smoke test trên URL Pages thật và hướng dẫn nhập nội dung đã được xác minh.

## 13. Tài liệu kỹ thuật tham khảo

- Vite / GitHub Pages: https://vite.dev/guide/static-deploy.html#github-pages
- Google Workspace credentials: https://developers.google.com/workspace/guides/create-credentials
- API key restrictions: https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys
- Metadata API: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get
- Batch values API: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet
- Sheets API quotas: https://developers.google.com/workspace/sheets/api/limits
