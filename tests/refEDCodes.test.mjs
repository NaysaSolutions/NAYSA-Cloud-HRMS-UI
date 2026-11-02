import test from 'node:test';
import assert from 'node:assert/strict';
import { ED_FIELDS, ED_INITIAL_FORM, normalizeEDForm, validateEDForm, buildEDPayload, parseEDResult, parseEDFlag } from '../src/NAYSA Cloud/Global/refEDCodes.js';

test('ED payload includes all 21 editable columns and keeps classification separate from the primary key', () => {
  const form = { ...ED_INITIAL_FORM, edCode: 'd01', edName: 'Tax', edType: 'DED', code: 'TAX', order: '1', compHdmf: '', tax2316: '25', ntax2316: '25' };
  const payload = buildEDPayload(form, 'TESTUSER', 'EDIT');
  assert.equal(ED_FIELDS.length, 21);
  assert.equal(payload.json_data.edCode, 'D01');
  assert.equal(payload.json_data.code, 'TAX');
  assert.equal(payload.json_data.ctrp, '');
  assert.equal(payload.json_data.tax2316, '25');
  assert.equal(payload.json_data.userCode, 'TESTUSER');
  assert.equal(payload.json_data.action, 'EDIT');
});

test('schema widths and required description are validated', () => {
  assert.match(validateEDForm({ ...ED_INITIAL_FORM, edCode: 'E999', edName: 'Test' }), /3 characters/);
  assert.match(validateEDForm({ ...ED_INITIAL_FORM, edCode: 'E99' }), /Description is required/);
  assert.equal(validateEDForm({ ...ED_INITIAL_FORM, edCode: 'E99', edName: 'Test', compHdmf: 'Y' }), '');
});

test('editing preserves blank flags and longer HDMF settings', () => {
  const form = normalizeEDForm({ edCode: 'D01', ctrp: '', taxable: null, compHdmf: 'FIXED', active: 'N' });
  assert.equal(form.ctrp, '');
  assert.equal(form.taxable, '');
  assert.equal(form.compHdmf, 'FIXED');
  assert.equal(form.active, 'N');
});

test('existing procedure response formats and usage flags are parsed', () => {
  assert.deepEqual(parseEDResult({ data: { data: [{ result: '[{"edCode":"D01"}]' }] } }), [{ edCode: 'D01' }]);
  assert.equal(parseEDFlag({ data: { data: [{ result: '{"result":"1"}' }] } }), true);
  assert.equal(parseEDFlag({ data: { data: [{ result: '{"result":"0"}' }] } }), false);
  assert.throws(() => parseEDFlag({ data: { data: [{ result: '{"result":"bad"}' }] } }), /Invalid/);
  assert.throws(() => parseEDResult({ data: { data: [{ errorcount: 1, errormsg: 'Invalid code' }] } }), /Invalid code/);
});
