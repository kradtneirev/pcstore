# PC Store – Ứng dụng bán linh kiện máy tính

Gồm 2 phần:

| Thư mục | Công nghệ | Vai trò |
|---|---|---|
| `backend/` | Node.js + Express, lưu dữ liệu bằng file JSON | REST API: sản phẩm, tìm kiếm, tài khoản, giỏ hàng/báo giá, đơn hàng, thanh toán |
| `mobile/` | React Native + Expo SDK 57 (Expo Router, Redux Toolkit) | Ứng dụng Android (APK) |

## 1. Backend

**Link API công khai (Render.com):** https://pcstore-api-dbh6.onrender.com — app dùng link này mặc định, không cần bật máy tính.
Ví dụ: https://pcstore-api-dbh6.onrender.com/api/products?q=rtx

- Gói miễn phí: server "ngủ" sau 15 phút không dùng, lần mở đầu chờ khoảng 30–50 giây.
- Đơn hàng/tài khoản mới tạo bị xóa khi server khởi động lại; sản phẩm, ảnh và tài khoản demo luôn còn.
- Mỗi lần `git push` lên GitHub, Render tự triển khai lại (cấu hình trong `render.yaml`).

Chạy backend trên máy (tùy chọn):

```bash
cd backend
npm install        # lần đầu
npm start          # chạy tại cổng 4000
```

Màn hình sẽ in ra địa chỉ để nhập vào app, ví dụ `http://192.168.1.252:4000`.

- Lần đầu chạy, Windows hỏi cho phép Node.js qua tường lửa: chọn **Allow** (mạng Private) để điện thoại kết nối được.
- Tài khoản demo: **demo@pcstore.vn / 123456**
- Khôi phục dữ liệu ban đầu (xóa đơn hàng, tài khoản mới tạo): `npm run reset-data`
- Chạy kiểm thử API: `npm test`

## 2. Cài APK lên điện thoại

File APK: `PCStore.apk` (cùng thư mục với file này).

1. Gửi file APK cho điện thoại (Zalo, Google Drive, cáp USB...) và cài đặt (cho phép "Cài ứng dụng không rõ nguồn gốc" nếu được hỏi).
2. Điện thoại chỉ cần có Internet, app tự kết nối tới link API trên Render.
3. Muốn dùng backend chạy trên máy tính: vào **Tài khoản → Cài đặt máy chủ**, nhập `http://<IP máy tính>:4000`, bấm **Kiểm tra** rồi **Lưu** (điện thoại và máy tính phải cùng Wi-Fi).

## 3. Chức năng

- **Trang chủ**: banner, danh mục, Flash Sale có đếm ngược, bán chạy, hàng mới về, kéo để làm mới.
- **Tìm kiếm**: gõ không dấu vẫn tìm được ("ban phim" → Bàn phím), lọc theo danh mục, hãng, còn hàng; sắp xếp theo phổ biến, mới nhất, giá, đánh giá; cuộn để tải thêm (phân trang).
- **Danh mục**: 12 nhóm linh kiện, danh sách sản phẩm theo nhóm.
- **Chi tiết sản phẩm**: giá, giảm giá, tồn kho, chọn số lượng, mô tả, thông số kỹ thuật, sản phẩm tương tự, Thêm vào giỏ / Mua ngay.
- **Giỏ hàng**: chọn từng sản phẩm hoặc tất cả, đổi số lượng (giới hạn theo tồn kho, tối đa 10), xóa, gợi ý miễn phí vận chuyển, tự cập nhật giá mới nhất. Giỏ hàng được lưu trên máy.
- **Đăng nhập / Đăng ký** (email hoặc số điện thoại), giữ đăng nhập sau khi tắt app.
- **Thanh toán**: địa chỉ nhận hàng, mã giảm giá (`PCSTORE10`, `GIAM200K`, `FREESHIP`), 5 phương thức:
  - Thanh toán khi nhận hàng (COD)
  - Chuyển khoản ngân hàng, Ví MoMo, Ví ZaloPay: hiện thông tin chuyển tiền, nút sao chép, đếm ngược 15 phút; quá hạn đơn tự hủy và hoàn kho
  - Thẻ tín dụng/ghi nợ: kiểm tra số thẻ (Luhn), hạn, CVV
- **Đơn hàng**: danh sách và lọc theo trạng thái, chi tiết với dòng thời gian, hủy đơn (tự hoàn tiền nếu đã thanh toán), mua lại.
- **Tài khoản**: sửa thông tin và địa chỉ mặc định, cài đặt máy chủ, đăng xuất.

### Thanh toán là môi trường demo

Không có giao dịch tiền thật:

- Chuyển khoản / MoMo / ZaloPay: bấm **"Tôi đã thanh toán"** để giả lập ngân hàng/ví báo đã nhận tiền.
- Thẻ: dùng `4242 4242 4242 4242`, hạn bất kỳ trong tương lai (vd `12/30`), CVV bất kỳ.
  Thẻ `4000 0000 0000 0002` luôn bị từ chối để thử trường hợp thanh toán thất bại.
- Số thẻ đầy đủ không được lưu, chỉ lưu 4 số cuối.

## 4. Kiến thức trong bài giảng được áp dụng

| Bài giảng | Áp dụng trong app |
|---|---|
| ES6 | arrow function, destructuring, spread/rest, template literals, Map/Set, async/await, module |
| Style & Component | StyleSheet, Flexbox, FlatList, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, RefreshControl, KeyboardAvoidingView |
| Props & State | component tái sử dụng (`ProductCard`, `QuantityStepper`, `Button`...), lifting state up |
| Hooks | useState, useEffect (debounce tìm kiếm, đếm ngược, cleanup), useCallback, useMemo, useRef, custom hook `useProductList`, React.memo |
| Chương 4 – Điều hướng | Expo Router: Stack + Bottom Tabs, truyền tham số (`/product/[id]`, `?redirect=`), modal |
| Chương 5 – Quản lý trạng thái | **Redux Toolkit** (`createSlice`, `configureStore`, `createAsyncThunk`, `useSelector`, `useDispatch`, `createSelector`) cho giỏ hàng, đăng nhập, cài đặt; **Context API** cho thông báo (Toast) |
| Chương 6 – API | fetch + async/await, xử lý loading/error/retry, `response.ok`, timeout, phân trang & cuộn vô hạn (`onEndReached`), kéo để làm mới (`RefreshControl`) |

## 5. Build lại APK

```bash
cd mobile
npm install
npx expo prebuild -p android
cd android
gradlew.bat assembleRelease
# APK: mobile/android/app/build/outputs/apk/release/app-release.apk
```

Đổi địa chỉ backend mặc định: sửa `expo.extra.apiUrl` trong `mobile/app.json` trước khi build.

Chạy thử nhanh không cần build: `cd mobile && npx expo start` rồi quét QR bằng Expo Go.
