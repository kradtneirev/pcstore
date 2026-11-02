import { Href, router } from 'expo-router';

/**
 * Đóng các màn hình đăng nhập/đăng ký (số lượng = screens) rồi
 * chuyển tới trang trong tham số redirect (nếu có), ví dụ "/checkout".
 */
export function finishAuth(redirect: string | undefined, screens: number) {
  if (router.canDismiss()) router.dismiss(screens);
  else if (router.canGoBack()) router.back();
  if (redirect) router.push(redirect as Href);
}
