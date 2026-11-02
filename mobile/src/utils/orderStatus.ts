import type { Order } from '../api/types';
import type { IconName } from '../constants/categories';
import { colors } from '../constants/theme';

export function orderStatusInfo(order: Pick<Order, 'status' | 'payment'>): {
  label: string;
  color: string;
  bg: string;
  icon: IconName;
} {
  if (order.status === 'cancelled') return { label: 'Đã hủy', color: colors.danger, bg: colors.dangerSoft, icon: 'close-circle' };
  if (order.status === 'pending_payment') return { label: 'Chờ thanh toán', color: colors.warning, bg: colors.warningSoft, icon: 'clock-outline' };
  return { label: 'Đã xác nhận', color: colors.success, bg: colors.successSoft, icon: 'check-circle' };
}

export function paymentStatusLabel(status: Order['payment']['status']) {
  return {
    unpaid: 'Thanh toán khi nhận hàng',
    pending: 'Chờ thanh toán',
    paid: 'Đã thanh toán',
    refunded: 'Đã hoàn tiền',
    expired: 'Hết hạn thanh toán',
    cancelled: 'Đã hủy',
  }[status];
}

export const PAYMENT_BRAND: Record<string, { colors: [string, string]; icon: IconName; name: string }> = {
  bank: { colors: ['#0F766E', '#14B8A6'], icon: 'bank', name: 'Chuyển khoản ngân hàng' },
  momo: { colors: ['#A50064', '#D82D8B'], icon: 'wallet', name: 'Ví MoMo' },
  zalopay: { colors: ['#0068FF', '#00A2FF'], icon: 'wallet', name: 'Ví ZaloPay' },
};
