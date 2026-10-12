import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/NAYSA Cloud/Configuration/BaseURL.jsx';

const BASE='/leave-transaction';
const blank={lvCode:'',startDate:'',endDate:'',lvHours:'',lvDays:'',hourRate:'',dailyRate:'',remarks:''};
const number=(v)=>Number(v||0);
const fmt=(v)=>number(v).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const errorOf=(e)=>e?.response?.data?.message||e?.message||'Request failed';

const Field=({label,value,onChange,type='text',step})=><label className="flex flex-col gap-1 text-xs font-medium text-slate-600">{label}<input type={type} step={step} value={value??''} onChange={e=>onChange(e.target.value)} className="min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"/></label>;
const Code=({value,onChange,codes=[]})=><select value={value||''} onChange={e=>onChange(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"><option value="">Select leave</option>{codes.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select>;

const Entry=({employee,id,original,forms,setRow,codes,busy,save,remove})=>{
    const v={...blank,...original,...forms[id]};
    const patch=(k,value)=>setRow(id,{[k]:value});
    const readOnly=original?.docStatus==='F'||!!original?.refTs;
    const paid=codes.find(c=>c.code===v.lvCode)?.paid==='Y';
  
  return <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-4 xl:grid-cols-8">
      <div className="col-span-2"><label className="text-xs text-slate-600">Leave Code</label><Code codes={codes} value={v.lvCode} onChange={value=>patch('lvCode',value)}/></div>
      <Field label="Start Date" type="date" value={v.startDate} onChange={x=>patch('startDate',x)}/>
      <Field label="End Date" type="date" value={v.endDate} onChange={x=>patch('endDate',x)}/>
      <Field label="Leave Hours" type="number" step="0.000001" value={v.lvHours} onChange={x=>patch('lvHours',x)}/>
      <Field label="Leave Days" type="number" step="0.000001" value={v.lvDays} onChange={x=>patch('lvDays',x)}/>
      <Field label="Hourly Rate *" type="number" step="0.000001" value={v.hourRate} onChange={x=>patch('hourRate',x)}/>
      <div className="flex flex-col gap-1 text-xs text-slate-600"><span>Estimated Amount</span><strong className="pt-1 text-sm text-slate-900">₱{fmt(paid?number(v.hourRate)*number(v.lvHours):0)}</strong></div>
      <div className="col-span-2 md:col-span-3 xl:col-span-6"><Field label="Remarks" value={v.remarks} onChange={x=>patch('remarks',x)}/></div>
      <div className="col-span-2 flex items-end gap-2"><button disabled={busy||readOnly} className="rounded bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40" onClick={()=>save(employee,original?.detailId,original)}>Save {original?'Changes':'Leave'}</button>{original&&<button disabled={busy||readOnly} className="rounded border border-red-300 px-3 py-2 text-xs text-red-700 disabled:opacity-40" onClick={()=>remove(original.detailId)}>Delete</button>}</div>
      {readOnly&&<p className="col-span-full text-xs text-amber-700">Finalized or timesheet-linked entry: editing disabled.</p>}
    </div>;
  };

export default function LeaveTransaction(){
  const [filters,setFilters]=useState({payFreq:'',cutOff:'',branchCode:'',clientCode:'',groupCode:'',deptCode:'',positionCode:'',empStatus:''});
  const [employees,setEmployees]=useState([]);
  const [records,setRecords]=useState([]);
  const [codes,setCodes]=useState([]);
  const [forms,setForms]=useState({});
  const [checked,setChecked]=useState([]);
  const [bulk,setBulk]=useState({...blank});
  const [search,setSearch]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [showFinalized,setShowFinalized]=useState(false);
  const changeFilter=(key,value)=>setFilters(f=>({...f,[key]:value}));
  const request=useCallback(async(mode,data={})=>{
    const res=await apiClient.post(`${BASE}/${mode.toLowerCase()}`,{json_data:data});
    if(!res.data?.success) throw new Error(res.data?.message||'Request failed');
    return res.data?.data||[];
  },[]);
  useEffect(()=>{request('references').then(rows=>setCodes(rows)).catch(e=>setError(errorOf(e)));},[request]);
  const reload=useCallback(async()=>{
    if(!filters.payFreq||!filters.cutOff){setError('Select payroll frequency and cutoff.');return;}
    setBusy(true);setError('');setMessage('');
    try{
      const [emp,items]=await Promise.all([request('employees',filters),request('load',filters)]);
      setEmployees(emp);setRecords(items);
      setForms({});setChecked([]);setShowFinalized(items.some(r=>r.docStatus==='F'));
    }catch(e){setError(errorOf(e));}finally{setBusy(false);}
  },[filters,request]);
  const setRow=(id,patch)=>setForms(old=>({...old,[id]:{...blank,...old[id],...patch}}));
  const selected=(id)=>checked.includes(id);
  const toggle=(id,on)=>setChecked(old=>on?[...new Set([...old,id])]:old.filter(x=>x!==id));
  const visible=useMemo(()=>employees.filter(e=>`${e.empName} ${e.empNo}`.toLowerCase().includes(search.toLowerCase())),[employees,search]);
  const existing=(id)=>records.filter(r=>r.empNo===id);
  const applyBulk=()=>{
    if(!checked.length){setError('Select one or more employees.');return;}
    if(!bulk.lvCode||!bulk.startDate||!bulk.endDate||!number(bulk.lvHours)||!number(bulk.lvDays)){setError('Complete leave code, dates, hours and days.');return;}
    setForms(old=>{const next={...old};checked.forEach(id=>{next[id]={...blank,...old[id],lvCode:bulk.lvCode,startDate:bulk.startDate,endDate:bulk.endDate,lvHours:bulk.lvHours,lvDays:bulk.lvDays,remarks:bulk.remarks};});return next;});
    setMessage(`Applied common leave values to ${checked.length} employees. Existing rates were not copied.`);setError('');
  };
  const save=async(emp,detailId=null,original=null)=>{
    const v=forms[detailId||emp.empNo]||original||blank;
    if(!v.lvCode||!v.startDate||!v.endDate||!number(v.lvHours)||!number(v.lvDays)||v.hourRate===''){
      setError(`Complete leave code, dates, hours, days and verified hourly rate for ${emp.empName}.`);return;
    }
    setBusy(true);setError('');setMessage('');
    try{
      await request('upsert',{...filters,empNo:emp.empNo,...v,detailId:detailId||undefined});
      setMessage(`Leave saved for ${emp.empName}.`);await reload();
    }catch(e){setError(errorOf(e));}finally{setBusy(false);}
  };
  const remove=async(id)=>{
    if(!window.confirm('Delete this draft leave entry?'))return;
    setBusy(true);setError('');
    try{await request('delete',{detailId:id});await reload();setMessage('Leave deleted.');}
    catch(e){setError(errorOf(e));}finally{setBusy(false);}
  };
  const lifecycle=async(mode)=>{
    if(!filters.payFreq||!filters.cutOff)return setError('Select payroll period first.');
    if(!window.confirm(`${mode} leave records for the selected payroll period?`))return;
    setBusy(true);setError('');
    try{await request(mode,filters);await reload();setMessage(`${mode} completed.`);}
    catch(e){setError(errorOf(e));}finally{setBusy(false);}
  };
  return <div className="mx-auto max-w-[1650px] space-y-4 p-4 text-slate-800">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">Leave Transaction</h1><p className="text-xs text-slate-500">Employee-based leave encoding by payroll period · date-range entries</p></div><div className="flex gap-2"><button disabled={busy} onClick={()=>lifecycle('validate')} className="rounded border px-3 py-2 text-xs">Validate</button><button disabled={busy} onClick={()=>lifecycle('finalize')} className="rounded bg-emerald-700 px-3 py-2 text-xs text-white">Finalize</button><button disabled={busy} onClick={()=>lifecycle('unfinalize')} className="rounded border px-3 py-2 text-xs">Reopen</button></div></header>
    {error&&<div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {message&&<div role="status" className="rounded border border-blue-200 bg-blue-50 p-3 text-sm">{message}</div>}
    <section className="grid grid-cols-2 gap-3 rounded-xl border bg-white p-4 md:grid-cols-4 xl:grid-cols-8">
      {[['payFreq','Payroll Frequency'],['cutOff','Payroll Cutoff'],['branchCode','Branch'],['clientCode','Client'],['groupCode','Payroll Group'],['deptCode','Department'],['positionCode','Position'],['empStatus','Employee Status']].map(([key,label])=><Field key={key} label={label} value={filters[key]} onChange={v=>changeFilter(key,v)}/>)}
      <div className="col-span-full flex items-center justify-between gap-2"><p className="text-xs text-slate-500">Enter actual codes from your payroll period/reference lookup. Blank optional filters mean All.</p><button disabled={busy} onClick={reload} className="rounded bg-blue-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy?'Loading...':'Load Employees & Leaves'}</button></div>
    </section>
    <section className="rounded-xl border bg-white p-4"><h2 className="mb-3 font-semibold">Apply to Selected Employees</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-5"><div className="col-span-2"><label className="text-xs">Leave Code</label><Code codes={codes} value={bulk.lvCode} onChange={v=>setBulk(b=>({...b,lvCode:v}))}/></div>{[['startDate','Start Date','date'],['endDate','End Date','date'],['lvHours','Hours','number'],['lvDays','Days','number']].map(([key,label,type])=><Field key={key} label={label} type={type} value={bulk[key]} onChange={v=>setBulk(b=>({...b,[key]:v}))}/>)}</div><button onClick={applyBulk} className="mt-3 rounded border border-blue-700 px-3 py-2 text-sm text-blue-700">Apply to {checked.length} Selected Employees</button><p className="mt-2 text-xs text-slate-500">Bulk apply prepares unsaved entries; save each employee after verifying the rate. An employee may have multiple non-overlapping leave ranges.</p></section>
    <section className="rounded-xl border bg-white p-4"><div className="mb-3 flex flex-wrap justify-between gap-2"><div className="font-semibold">Employee Leave Details <span className="text-xs font-normal text-slate-500">({visible.length} employees; {records.length} saved records)</span></div><input className="rounded border px-3 py-2 text-sm" placeholder="Search employee..." value={search} onChange={e=>setSearch(e.target.value)}/></div><label className="mb-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={visible.length>0&&visible.every(e=>selected(e.empNo))} onChange={e=>setChecked(old=>e.target.checked?[...new Set([...old,...visible.map(x=>x.empNo)])]:old.filter(id=>!visible.some(x=>x.empNo===id)))}/> Select all visible employees</label>
      <div className="max-h-[70vh] space-y-3 overflow-auto">{visible.map(emp=><article key={emp.empNo} className="space-y-2 rounded-lg border p-3"><div className="flex flex-wrap items-center gap-3"><input type="checkbox" checked={selected(emp.empNo)} onChange={e=>toggle(emp.empNo,e.target.checked)}/><strong className="text-sm">{emp.empName}</strong><span className="text-xs text-slate-500">{emp.empNo}</span><span className="text-xs text-slate-500">{emp.deptCode} / {emp.branchCode}</span><span className="ml-auto text-xs text-slate-500">{existing(emp.empNo).length} saved leave(s)</span></div>{existing(emp.empNo).map(r=><div key={r.detailId} className="space-y-1"><p className="text-xs text-slate-600">Existing #{r.detailId} · {r.lvCode} · {r.startDate} to {r.endDate}</p><Entry employee={emp} id={r.detailId} original={r} forms={forms} setRow={setRow} codes={codes} busy={busy} save={save} remove={remove}/></div>)}<details className="rounded border border-dashed p-2" open={!!forms[emp.empNo]?.lvCode}><summary className="cursor-pointer text-xs font-semibold text-blue-700">+ Add another Leave Range</summary><div className="mt-2"><Entry employee={emp} id={emp.empNo} forms={forms} setRow={setRow} codes={codes} busy={busy} save={save} remove={remove}/></div></details></article>)}{!visible.length&&<p className="p-6 text-center text-sm text-slate-500">No employees loaded. Select payroll frequency and cutoff, then click Load.</p>}</div>
    </section><p className="text-xs text-amber-800">* Integration prerequisite: replace editable hourly-rate input with an authorized payroll-rate lookup before production. Permission/approval/credits validations require your application's actual policy and reference sources.</p>
  </div>;
}
