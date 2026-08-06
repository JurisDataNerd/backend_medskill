import { supabaseAdmin } from '../../utils/supabase.js';

export interface RentalConfig {
  billing_unit_hours: number;
  buffer_minutes: number;
  lock_minutes: number;
  operational_hours_start: string;
  operational_hours_end: string;
  overnight_end_time: string;
  deposit_threshold_amount: number;
  deposit_percentage: number;
  cancellation_h3_refund_pct: number;
  cancellation_h2_h1_pct: number;
  cancellation_day_of_pct: number;
}

export async function getRentalConfig(): Promise<RentalConfig> {
  const { data, error } = await supabaseAdmin
    .from('rental_config')
    .select('key, value');

  if (error) throw new Error('Failed to load rental config');

  const cfg: Record<string, string> = {};
  for (const row of data) cfg[row.key] = row.value;

  return {
    billing_unit_hours: parseInt(cfg.billing_unit_hours ?? '3'),
    buffer_minutes: parseInt(cfg.buffer_minutes ?? '30'),
    lock_minutes: parseInt(cfg.lock_minutes ?? '10'),
    operational_hours_start: cfg.operational_hours_start ?? '09:00',
    operational_hours_end: cfg.operational_hours_end ?? '21:00',
    overnight_end_time: cfg.overnight_end_time ?? '06:00',
    deposit_threshold_amount: parseInt(cfg.deposit_threshold_amount ?? '500000'),
    deposit_percentage: parseInt(cfg.deposit_percentage ?? '25'),
    cancellation_h3_refund_pct: parseInt(cfg.cancellation_h3_refund_pct ?? '100'),
    cancellation_h2_h1_pct: parseInt(cfg.cancellation_h2_h1_pct ?? '50'),
    cancellation_day_of_pct: parseInt(cfg.cancellation_day_of_pct ?? '0'),
  };
}

/**
 * Calculate billing units using CEIL(duration / billing_unit_hours)
 */
export function calcBillingUnits(durationHours: number, billingUnitHours: number): number {
  return Math.ceil(durationHours / billingUnitHours);
}

/**
 * Apply overnight rule: if end time crosses midnight, force end to 06:00 next day.
 * Returns { adjustedEndTime: Date, isOvernight: boolean, adjustedDurationHours: number }
 */
export function applyOvernightRule(startAt: Date, requestedDurationHours: number, overnightEndTime: string) {
  const endAt = new Date(startAt.getTime() + requestedDurationHours * 3600 * 1000);

  // Check WIB (UTC+7) times
  const startWIB = new Date(startAt.getTime() + 7 * 3600 * 1000);
  const endWIB = new Date(endAt.getTime() + 7 * 3600 * 1000);

  // Midnight in WIB = same day start (00:00)
  const startDayWIB = Math.floor(startWIB.getTime() / 86400000);
  const endDayWIB = Math.floor(endWIB.getTime() / 86400000);

  if (endDayWIB > startDayWIB && startWIB.getUTCHours() >= 12) {
    // Crosses midnight → force end to overnight_end_time next day
    const [h, m] = overnightEndTime.split(':').map(Number);
    const forcedEndWIB = new Date(endWIB);
    forcedEndWIB.setUTCHours(h - 7 < 0 ? h + 17 : h - 7, m, 0, 0); // convert WIB to UTC
    // next calendar day in WIB
    const nextDayUTC = new Date(startAt);
    nextDayUTC.setUTCDate(nextDayUTC.getUTCDate() + 1);
    nextDayUTC.setUTCHours(h - 7 < 0 ? h + 17 : h - 7, m, 0, 0);

    const adjustedDuration = (nextDayUTC.getTime() - startAt.getTime()) / 3600000;
    return { adjustedEndTime: nextDayUTC, isOvernight: true, adjustedDurationHours: adjustedDuration };
  }

  return { adjustedEndTime: endAt, isOvernight: false, adjustedDurationHours: requestedDurationHours };
}

/**
 * Calculate refund percentage based on days before rental
 */
export function calcRefundPercentage(rentalDate: Date, cancelledAt: Date, config: RentalConfig): number {
  const msPerDay = 86400000;
  const rentalDay = new Date(rentalDate);
  rentalDay.setHours(0, 0, 0, 0);
  const cancelDay = new Date(cancelledAt);
  cancelDay.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((rentalDay.getTime() - cancelDay.getTime()) / msPerDay);

  if (diffDays >= 3) return config.cancellation_h3_refund_pct;
  if (diffDays >= 1) return config.cancellation_h2_h1_pct;
  return config.cancellation_day_of_pct;
}
