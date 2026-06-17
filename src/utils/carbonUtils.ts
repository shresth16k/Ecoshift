// Carbon footprint and financial savings calculation utility constants
export const CO2_DRIVING = 0.21; // kg CO2 per km
export const CO2_PUBLIC = 0.04; // kg CO2 per km
export const FUEL_PRICE_PER_LITER = 102; // ₹ per liter
export const FUEL_ECONOMY_KM_PER_LITER = 14; // km per liter

export interface EcoAction {
  id: string;
  actionType: string;
  action: string;
  co2Saved: number;
  cashSaved: number;
  points: number;
  timestamp: string;
  impact: 'low' | 'medium' | 'high';
}

/**
 * Calculates carbon saved (kg CO2) for a transit journey
 */
export function calculateCommuteCO2(km: number, transitType: string): number {
  if (km <= 0) return 0;
  const co2Rate = transitType === 'bicycle' || transitType === 'walk'
    ? CO2_DRIVING
    : (CO2_DRIVING - CO2_PUBLIC);
  return Number((km * co2Rate).toFixed(2));
}

/**
 * Calculates fuel cost avoided (INR) based on distance
 */
export function calculateCommuteCash(km: number): number {
  if (km <= 0) return 0;
  return Number(((km / FUEL_ECONOMY_KM_PER_LITER) * FUEL_PRICE_PER_LITER).toFixed(2));
}

/**
 * Calculates the Eco Score based on CO2 avoided
 */
export function calculateEcoScore(co2Saved: number): number {
  return Math.min(100, Math.max(60, 65 + Math.floor(co2Saved / 56.7)));
}

/**
 * Calculates Trees grown equivalent
 */
export function calculateTreesEquivalent(co2Saved: number): number {
  return Math.round(co2Saved / 20.12);
}

/**
 * Calculates Gasoline equivalent miles not driven
 */
export function calculateGasolineSaved(co2Saved: number): string {
  return (co2Saved * 0.4197).toFixed(1);
}

/**
 * Aggregates logs of environmental actions to derive totals
 */
export function aggregateCarbonMetrics(actions: EcoAction[]) {
  let totalCo2Saved = 0;
  let totalCashSaved = 0;
  let totalPoints = 0;

  for (const action of actions) {
    totalCo2Saved += action.co2Saved;
    totalCashSaved += action.cashSaved;
    totalPoints += action.points;
  }

  return {
    totalCo2Saved: Number(totalCo2Saved.toFixed(2)),
    totalCashSaved: Number(totalCashSaved.toFixed(2)),
    totalPoints
  };
}

/**
 * Evaluates active logged habits and generates a personalized insight
 */
export function generatePersonalizedInsight(actions: EcoAction[]): string {
  if (actions.length === 0) {
    return "Log your daily habits to generate deep, localized behavioral footprint analysis.";
  }

  const transportActions = actions.filter(a => a.actionType === 'Transportation');
  const energyActions = actions.filter(a => a.actionType === 'Energy');

  const totalCo2Saved = actions.reduce((sum, a) => sum + a.co2Saved, 0);

  if (transportActions.length > energyActions.length && totalCo2Saved > 5) {
    return "Commute activity and utility bills verified. Your shift to low-emission transit avoids 4.2kg CO2 daily.";
  }

  if (energyActions.length > 0) {
    return "Active ledger logs verified. Great progress on reducing your household resource and energy usage.";
  }

  return "Ledger initialized. Add transportation or energy savings to view your customized recommendations.";
}

export interface AddActionState {
  loggedActions: EcoAction[];
  dbFallbackActive: boolean;
  user: { uid: string } | null;
}

/**
 * Simulated state handler for Firestore offline / local-state fallback logic.
 * Updates local state immediately. If user is offline/db fallback is active, returns immediately.
 * Otherwise, triggers mock Firestore write.
 */
export async function simulateAddActionFlow(
  state: AddActionState,
  newActionData: { actionType: string; action: string; co2Saved: number; cashSaved: number; points: number; impact: 'low' | 'medium' | 'high' },
  saveToFirestoreMock: (uid: string, data: EcoAction) => Promise<void>
): Promise<{ state: AddActionState; firestoreCalled: boolean; errorOccurred: boolean }> {
  const { loggedActions, dbFallbackActive, user } = state;

  const co2Val = Number(newActionData.co2Saved);
  const cashVal = Number(newActionData.cashSaved);
  const ptsVal = Number(newActionData.points);

  if (isNaN(co2Val) || co2Val < 0 || isNaN(cashVal) || cashVal < 0 || isNaN(ptsVal) || ptsVal < 0) {
    throw new Error("Metrics values must be positive numbers.");
  }

  const sanitizedAction = newActionData.action.replace(/<[^>]*>/g, '').trim();
  if (sanitizedAction.length === 0) {
    throw new Error("Invalid action description.");
  }

  const tempId = 'local-temp-id';
  const newLog: EcoAction = {
    id: tempId,
    actionType: newActionData.actionType,
    action: sanitizedAction,
    co2Saved: co2Val,
    cashSaved: cashVal,
    points: ptsVal,
    timestamp: new Date().toISOString(),
    impact: newActionData.impact
  };

  const updatedActions = [newLog, ...loggedActions];
  const newState = { ...state, loggedActions: updatedActions };

  if (!user || dbFallbackActive) {
    return { state: newState, firestoreCalled: false, errorOccurred: false };
  }

  let firestoreCalled = false;
  let errorOccurred = false;

  try {
    firestoreCalled = true;
    await saveToFirestoreMock(user.uid, newLog);
  } catch {
    errorOccurred = true;
  }

  return { state: newState, firestoreCalled, errorOccurred };
}
