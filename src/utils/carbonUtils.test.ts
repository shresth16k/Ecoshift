import { describe, it, expect, vi } from 'vitest';
import {
  calculateCommuteCO2,
  calculateCommuteCash,
  calculateEcoScore,
  calculateTreesEquivalent,
  calculateGasolineSaved,
  aggregateCarbonMetrics,
  generatePersonalizedInsight,
  simulateAddActionFlow,
  CO2_DRIVING,
  CO2_PUBLIC
} from './carbonUtils';
import type { EcoAction, AddActionState } from './carbonUtils';

describe('Carbon Footprint calculation logic', () => {
  it('should compute zero carbon savings for zero or negative distance', () => {
    expect(calculateCommuteCO2(0, 'bicycle')).toBe(0);
    expect(calculateCommuteCO2(-5, 'train')).toBe(0);
  });

  it('should calculate correct emissions avoided for clean active commutes (bicycle/walk)', () => {
    const km = 10;
    const expected = Number((km * CO2_DRIVING).toFixed(2));
    expect(calculateCommuteCO2(km, 'bicycle')).toBe(expected);
    expect(calculateCommuteCO2(km, 'walk')).toBe(expected);
  });

  it('should calculate correct emissions avoided for public/shared electric commutes', () => {
    const km = 15;
    const expected = Number((km * (CO2_DRIVING - CO2_PUBLIC)).toFixed(2));
    expect(calculateCommuteCO2(km, 'train')).toBe(expected);
    expect(calculateCommuteCO2(km, 'bus')).toBe(expected);
  });

  it('should compute zero cash savings for zero or negative distance', () => {
    expect(calculateCommuteCash(0)).toBe(0);
    expect(calculateCommuteCash(-10)).toBe(0);
  });

  it('should calculate correct fuel cost avoided', () => {
    const km = 14;
    expect(calculateCommuteCash(km)).toBe(102);
  });
});

describe('Eco Score, Trees & Gasoline conversions', () => {
  it('should calculate Eco Score accurately', () => {
    expect(calculateEcoScore(0)).toBe(65);
    expect(calculateEcoScore(100)).toBe(66); // 65 + floor(100 / 56.7) = 65 + 1 = 66
    expect(calculateEcoScore(2000)).toBe(100); // capped at 100
  });

  it('should calculate Trees Grown Equivalent', () => {
    expect(calculateTreesEquivalent(0)).toBe(0);
    expect(calculateTreesEquivalent(20.12)).toBe(1);
    expect(calculateTreesEquivalent(100)).toBe(5);
  });

  it('should calculate Gasoline miles not driven equivalent', () => {
    expect(calculateGasolineSaved(0)).toBe("0.0");
    expect(calculateGasolineSaved(10)).toBe("4.2");
  });
});

describe('Carbon Metrics aggregation logic', () => {
  it('should aggregate an empty list of actions correctly', () => {
    const metrics = aggregateCarbonMetrics([]);
    expect(metrics.totalCo2Saved).toBe(0);
    expect(metrics.totalCashSaved).toBe(0);
    expect(metrics.totalPoints).toBe(0);
  });

  it('should sum up co2Saved, cashSaved, and points correctly', () => {
    const actions: EcoAction[] = [
      {
        id: '1',
        actionType: 'Transportation',
        action: 'Electric train commute',
        co2Saved: 2.38,
        cashSaved: 102.00,
        points: 120,
        timestamp: new Date().toISOString(),
        impact: 'medium'
      },
      {
        id: '2',
        actionType: 'Energy',
        action: 'LED bulb installation',
        co2Saved: 1.50,
        cashSaved: 12.00,
        points: 100,
        timestamp: new Date().toISOString(),
        impact: 'low'
      }
    ];

    const metrics = aggregateCarbonMetrics(actions);
    expect(metrics.totalCo2Saved).toBe(3.88);
    expect(metrics.totalCashSaved).toBe(114.00);
    expect(metrics.totalPoints).toBe(220);
  });
});

describe('Personalized Insight / Recommendation generator', () => {
  it('should return default message when no actions are logged', () => {
    expect(generatePersonalizedInsight([])).toContain('Log your daily habits');
  });

  it('should suggest transport specific guidance when transit emissions are dominant and high', () => {
    const actions: EcoAction[] = [
      {
        id: '1',
        actionType: 'Transportation',
        action: 'Clean commute',
        co2Saved: 6.0,
        cashSaved: 50.0,
        points: 300,
        timestamp: new Date().toISOString(),
        impact: 'high'
      }
    ];
    const insight = generatePersonalizedInsight(actions);
    expect(insight).toContain('Commute activity');
    expect(insight).toContain('avoids 4.2kg CO2 daily');
  });

  it('should suggest energy specific guidance when energy logs exist', () => {
    const actions: EcoAction[] = [
      {
        id: '1',
        actionType: 'Energy',
        action: 'LED Swap',
        co2Saved: 1.5,
        cashSaved: 12.0,
        points: 100,
        timestamp: new Date().toISOString(),
        impact: 'medium'
      }
    ];
    const insight = generatePersonalizedInsight(actions);
    expect(insight).toContain('progress on reducing your household resource');
  });
});

describe('Firestore Offline Fallback Logic', () => {
  it('should bypass Firestore and save to local state immediately if dbFallbackActive is true', async () => {
    const initialState: AddActionState = {
      loggedActions: [],
      dbFallbackActive: true,
      user: { uid: 'demo-user' }
    };

    const mockSaveToFirestore = vi.fn().mockResolvedValue(undefined);

    const result = await simulateAddActionFlow(
      initialState,
      {
        actionType: 'Energy',
        action: 'Clean Solar Offset',
        co2Saved: 12.5,
        cashSaved: 50.0,
        points: 200,
        impact: 'high'
      },
      mockSaveToFirestore
    );

    // Should have updated local actions, but Firestore mock should NOT be called
    expect(result.state.loggedActions.length).toBe(1);
    expect(result.state.loggedActions[0].action).toBe('Clean Solar Offset');
    expect(result.firestoreCalled).toBe(false);
    expect(mockSaveToFirestore).not.toHaveBeenCalled();
  });

  it('should bypass Firestore and save locally if user is unauthenticated', async () => {
    const initialState: AddActionState = {
      loggedActions: [],
      dbFallbackActive: false,
      user: null
    };

    const mockSaveToFirestore = vi.fn().mockResolvedValue(undefined);

    const result = await simulateAddActionFlow(
      initialState,
      {
        actionType: 'Waste',
        action: 'Recycled Plastic',
        co2Saved: 0.8,
        cashSaved: 2.0,
        points: 40,
        impact: 'low'
      },
      mockSaveToFirestore
    );

    expect(result.state.loggedActions.length).toBe(1);
    expect(result.firestoreCalled).toBe(false);
    expect(mockSaveToFirestore).not.toHaveBeenCalled();
  });

  it('should attempt Firestore write and update local state if user is logged in and online', async () => {
    const initialState: AddActionState = {
      loggedActions: [],
      dbFallbackActive: false,
      user: { uid: 'auth-user-123' }
    };

    const mockSaveToFirestore = vi.fn().mockResolvedValue(undefined);

    const result = await simulateAddActionFlow(
      initialState,
      {
        actionType: 'Transportation',
        action: 'Metro Trip',
        co2Saved: 3.5,
        cashSaved: 22.0,
        points: 175,
        impact: 'medium'
      },
      mockSaveToFirestore
    );

    expect(result.state.loggedActions.length).toBe(1);
    expect(result.firestoreCalled).toBe(true);
    expect(result.errorOccurred).toBe(false);
    expect(mockSaveToFirestore).toHaveBeenCalledWith('auth-user-123', expect.any(Object));
  });

  it('should handle Firestore write error gracefully by updating local state and flagging error', async () => {
    const initialState: AddActionState = {
      loggedActions: [],
      dbFallbackActive: false,
      user: { uid: 'auth-user-123' }
    };

    const mockSaveToFirestore = vi.fn().mockRejectedValue(new Error('Network offline'));

    const result = await simulateAddActionFlow(
      initialState,
      {
        actionType: 'Transportation',
        action: 'Metro Trip',
        co2Saved: 3.5,
        cashSaved: 22.0,
        points: 175,
        impact: 'medium'
      },
      mockSaveToFirestore
    );

    // Local actions are still updated despite the database write failing
    expect(result.state.loggedActions.length).toBe(1);
    expect(result.firestoreCalled).toBe(true);
    expect(result.errorOccurred).toBe(true);
  });
});

describe('User Flow Integration Test', () => {
  it('should simulate: log an action -> Eco Score updates -> a personalized suggestion/insight appears', () => {
    // 1. Initial State (No actions)
    const actions: EcoAction[] = [];
    const initialEcoScore = calculateEcoScore(0);
    const initialInsight = generatePersonalizedInsight(actions);

    expect(initialEcoScore).toBe(65);
    expect(initialInsight).toContain('Log your daily habits');

    // 2. User logs an action: Active Bicycle Ride
    const bicycleCO2 = calculateCommuteCO2(30, 'bicycle');
    const newAction: EcoAction = {
      id: 'dynamic-id-1',
      actionType: 'Transportation',
      action: 'Active Bicycle Ride (30 km)',
      co2Saved: bicycleCO2,
      cashSaved: calculateCommuteCash(30),
      points: Math.round(bicycleCO2 * 50),
      timestamp: new Date().toISOString(),
      impact: 'high'
    };
    actions.push(newAction);

    // 3. Recalculate metrics
    const metrics = aggregateCarbonMetrics(actions);
    const updatedEcoScore = calculateEcoScore(metrics.totalCo2Saved);
    const updatedInsight = generatePersonalizedInsight(actions);

    // Eco Score should change depending on CO2 avoided
    expect(updatedEcoScore).toBe(Math.min(100, Math.max(60, 65 + Math.floor(bicycleCO2 / 56.7))));
    // Recommendation should reflect commute activity
    expect(updatedInsight).toContain('Commute activity');
    expect(updatedInsight).toContain('avoids 4.2kg CO2 daily');
  });
});
