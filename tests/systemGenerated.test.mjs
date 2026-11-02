import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSystemGeneratedPayload,
  parseSystemGeneratedReferences,
  parseSystemGeneratedResult,
} from '../src/NAYSA Cloud/Global/systemGenerated.js';

const envelope = (result) => ({ data: { success: true, data: [{ result: JSON.stringify(result) }] } });
const formatDate = (value) => {
  const [month, day, year] = value.split('/');
  return `${year}-${month}-${day}`;
};

test('save sends SG identifiers, explicit entered amounts and separate cutoff/detail frequencies', () => {
  const payload = buildSystemGeneratedPayload({
    sgId: 'existing-id', sgDate: '11/02/2026', cutoffType: 'S', cutoffFrequency: 'S1',
    cutoffCode: 'NOV1', cutoffStartDate: '11/01/2026', cutoffEndDate: '11/15/2026',
    amount: '999.99', frequency: 'W', remarks: 'Retain entered rows',
  }, [{
    groupId: 'row-id', empNo: 'EMP001', edCode: 'EARN001',
    startDate: '11/01/2026', endDate: '11/15/2026', amount: '1,234.50', frequency: 'S',
    holdFlag: 'Y', otRate: 999, otHours: 10,
  }], 'TESTUSER', formatDate);
  assert.deepEqual(payload, { jsonData: {
    sgId: 'existing-id', sgDate: '2026-11-02', cutoffType: 'S', cutoffFrequency: 'S1',
    cutoffCode: 'NOV1', cutoffStartDate: '2026-11-01', cutoffEndDate: '2026-11-15',
    tranType: 'Regular', remarks: 'Retain entered rows', genCode: 'M', userCode: 'TESTUSER',
    rows: [{ groupId: 'row-id', lineNo: 1, empNo: 'EMP001', edCode: 'EARN001',
      startDate: '2026-11-01', endDate: '2026-11-15', amount: 1234.5, frequency: 'S',
      holdFlag: 'Y', genCode: 'M' }],
  } });
});

test('new saves send null SG id and retain valid zero amount', () => {
  const payload = buildSystemGeneratedPayload({ sgDate: '11/02/2026', cutoffStartDate: '11/01/2026', cutoffEndDate: '11/30/2026' }, [
    { amount: '0.00', frequency: 'M', startDate: '11/01/2026', endDate: '11/30/2026' },
  ], 'TESTUSER', formatDate);
  assert.equal(payload.jsonData.sgId, null);
  assert.equal(payload.jsonData.rows[0].amount, 0);
  assert.equal(payload.jsonData.rows[0].holdFlag, 'N');
});

test('reference codes use ED_CODE rather than the REF_ED classification code', () => {
  const data = parseSystemGeneratedReferences(envelope({
    edCodes: [{ edCode: 'ALLOW001', edName: 'Allowance', code: 'TAXABLE' }],
    clients: [{ value: 'CLIENT1' }], statuses: [{ value: 'REG' }], positions: [{ value: 'POS1' }],
  }));
  assert.equal(data.edCodes[0].code, 'ALLOW001');
  assert.equal(data.edCodes[0].description, 'Allowance');
  assert.equal(data.clients[0].value, 'CLIENT1');
  assert.equal(data.statuses[0].value, 'REG');
  assert.equal(data.positions[0].value, 'POS1');
});

test('Get and selection results preserve amounts, hold flags and row frequencies', () => {
  const record = { sgId: 'id', documentStatus: 'D', rows: [{ amount: 1500.25, frequency: 'W', holdFlag: 'Y' }] };
  assert.deepEqual(parseSystemGeneratedResult(envelope(record)), record);
  assert.deepEqual(parseSystemGeneratedResult(envelope([])), []);
});

test('business errors and invalid JSON are not silently treated as empty data', () => {
  assert.throws(() => parseSystemGeneratedResult({ data: { success: false, message: 'Procedure missing' } }), /Procedure missing/);
  assert.throws(() => parseSystemGeneratedResult({ data: { data: [{ errorCount: 1, errorMsg: 'Invalid code' }] } }), /Invalid code/);
  assert.throws(() => parseSystemGeneratedResult({ data: { data: [{ result: '{broken' }] } }), /invalid JSON/);
  assert.throws(() => parseSystemGeneratedReferences(envelope({ overtimes: [] })), /invalid references/);
});
