import { describe, it, expect } from 'vitest';
import {
  calculateCommuteCO2,
  calculateCommuteCash,
  aggregateCarbonMetrics,
  generatePersonalizedInsight,
  CO2_DRIVING,
  CO2_PUBLIC
} from './carbonUtils';
import type { EcoAction } from './carbonUtils';

describe('Carbon Footprint calculation logic', () => {
  it('should compute zero carbon savings for zero or negative distance', () => {
    expect(calculateCommuteCO2(0, 'bicycle')).toBe(0);
    expect(calculateCommuteCO2(-5, 'train')).toBe(0);
  });

  it('should calculate correct emissions avoided for clean active commutes (bicycle/walk)', () => {
    const km = 10;
    // Bicycle uses standard CO2 driving rate since driving emissions are fully avoided
    const expected = Number((km * CO2_DRIVING).toFixed(2));
    expect(calculateCommuteCO2(km, 'bicycle')).toBe(expected);
    expect(calculateCommuteCO2(km, 'walk')).toBe(expected);
  });

  it('should calculate correct emissions avoided for public/shared electric commutes', () => {
    const km = 15;
    // Train uses avoided rate: driving rate minus public transit rate
    const expected = Number((km * (CO2_DRIVING - CO2_PUBLIC)).toFixed(2));
    expect(calculateCommuteCO2(km, 'train')).toBe(expected);
    expect(calculateCommuteCO2(km, 'bus')).toBe(expected);
  });

  it('should compute zero cash savings for zero or negative distance', () => {
    expect(calculateCommuteCash(0)).toBe(0);
    expect(calculateCommuteCash(-10)).toBe(0);
  });

  it('should calculate correct fuel cost avoided', () => {
    const km = 14; // Fuel economy is 14 km/liter, fuel price is 102
    expect(calculateCommuteCash(km)).toBe(102);
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

describe('User Flow Integration Test', () => {
  it('should simulate: logging an activity -> updating metrics -> receiving custom recommendation', () => {
    // 1. Initial empty state
    const actionsList: EcoAction[] = [];
    let metrics = aggregateCarbonMetrics(actionsList);
    let insight = generatePersonalizedInsight(actionsList);

    expect(metrics.totalCo2Saved).toBe(0);
    expect(insight).toContain('Log your daily habits');

    // 2. User logs a transit action of 30 km via train
    const distance = 30;
    const co2Saved = calculateCommuteCO2(distance, 'train');
    const cashSaved = calculateCommuteCash(distance);
    const newAction: EcoAction = {
      id: 'dynamic-log-id',
      actionType: 'Transportation',
      action: `Metro ride (${distance} km)`,
      co2Saved,
      cashSaved,
      points: Math.round(co2Saved * 50),
      timestamp: new Date().toISOString(),
      impact: 'high'
    };

    actionsList.push(newAction);

    // 3. Recalculate metrics and inspect insight changes
    metrics = aggregateCarbonMetrics(actionsList);
    insight = generatePersonalizedInsight(actionsList);

    // Assertions
    expect(metrics.totalCo2Saved).toBe(co2Saved);
    expect(metrics.totalCashSaved).toBe(cashSaved);
    expect(metrics.totalPoints).toBe(Math.round(co2Saved * 50));
    
    // Check that we got a custom commute recommendation
    expect(insight).toContain('Commute activity');
    expect(insight).toContain('avoids 4.2kg CO2 daily');
  });
});
