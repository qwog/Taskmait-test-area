import { describe, expect, it, vi } from 'vitest';
import { evaluatePrePour } from '@/lib/rules/engine';

vi.mock('@/lib/weather/nws', () => ({
  getNwsForecastWindow: vi.fn(async () => [
    { timestamp: '2026-04-24T12:00:00Z', tempF: 95, humidityPct: 20, windMph: 20 },
    { timestamp: '2026-04-24T13:00:00Z', tempF: 35, humidityPct: 30, windMph: 15 }
  ])
}));

describe('evaluatePrePour integration-ish', () => {
  it('returns red for seeded high-risk pour and writes evaluations', async () => {
    const inserts: any[] = [];
    const updates: any[] = [];
    const mock = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: 'pour-1',
                scheduled_at: '2026-04-24T12:00:00Z',
                job: { job_type: 'driveway', exposure_class: 'F2', latitude: 40, longitude: -75 },
                mix: {
                  cement_type: 'Type_IL',
                  design_strength_psi: 4000,
                  wc_ratio: 0.46,
                  target_air_pct_min: 4,
                  target_air_pct_max: 9,
                  target_slump_in_min: 4,
                  target_slump_in_max: 5,
                  admixtures: []
                }
              },
              error: null
            })
          })
        }),
        insert: async (payload: any) => {
          inserts.push({ table, payload });
          return { error: null };
        },
        update: (payload: any) => ({
          eq: async () => {
            updates.push({ table, payload });
            return { error: null };
          }
        })
      })
    } as any;

    const result = await evaluatePrePour('pour-1', mock);
    expect(result.level).toBe('red');
    expect(result.evaluations.length).toBe(12);
    expect(inserts.find((i) => i.table === 'rule_evaluations')).toBeTruthy();
    expect(updates.find((u) => u.table === 'pours')?.payload.pre_pour_risk_level).toBe('red');
  });
});
