import React, { forwardRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import { useFieldLenghtCheck, useGetFieldLength } from "@/NAYSA Cloud/Global/procedure";

const VendSetupTab = forwardRef(({ isLoading, isEditing, form, onChangeForm, onLookupCode, ...props }, ref) => {
  const { data: fieldLengths } = useQuery({
    queryKey: ["fieldLengths", "vend_mast"],
    queryFn: () => useFieldLenghtCheck("vend_mast"),
    staleTime: Infinity,
  });

  const getLen = (col, fallback = 50) => {
    const n = useGetFieldLength(fieldLengths || [], col);
    return n || fallback;
  };

  const isEmployee = form.sltypeCode === "EM";
  const isReadOnly = !isEditing;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="flex flex-col gap-6">
        <Card>
          <SectionHeader title="VENDOR INFORMATION" />
          <div className="grid grid-cols-2 gap-3">
            <FieldRenderer 
              label="SL Type" 
              type="select" 
              options={props.sltypeOptions} 
              value={form.sltypeCode} 
              onChange={(v) => onChangeForm({ sltypeCode: v })}
              readOnly={isReadOnly} 
            />
            <FieldRenderer label="Payee Code" value={form.vendCode} onLookup={onLookupCode} type="lookup" readOnly />
          </div>
          
          {isEmployee && (
            <div className="grid grid-cols-3 gap-2">
              <FieldRenderer label="First Name" value={form.firstName} onChange={(v) => onChangeForm({ firstName: v })} readOnly={isReadOnly} />
              <FieldRenderer label="Middle" value={form.middleName} onChange={(v) => onChangeForm({ middleName: v })} readOnly={isReadOnly} />
              <FieldRenderer label="Last" value={form.lastName} onChange={(v) => onChangeForm({ lastName: v })} readOnly={isReadOnly} />
            </div>
          )}

          <FieldRenderer 
            label="Registered Name" 
            value={form.vendName} 
            onChange={(v) => onChangeForm({ vendName: v })}
            readOnly={isReadOnly || isEmployee} 
            maxLength={getLen("vend_name")}
          />
        </Card>

        <Card>
          <SectionHeader title="CONTACT" />
          <div className="grid grid-cols-2 gap-3">
            <FieldRenderer label="Mobile No." value={form.vendMobileno} onChange={(v) => onChangeForm({ vendMobileno: v })} readOnly={isReadOnly} />
            <FieldRenderer label="Email" value={form.vendEmail} onChange={(v) => onChangeForm({ vendEmail: v })} readOnly={isReadOnly} />
          </div>
          <FieldRenderer label="Address 1" value={form.vendAddr1} onChange={(v) => onChangeForm({ vendAddr1: v })} readOnly={isReadOnly} />
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <SectionHeader title="PURCHASE SETTINGS" />
          <FieldRenderer 
            label="AP Account" 
            type="lookup" 
            value={form.acctCode} 
            onLookup={() => !isReadOnly && props.setIsAPAcctLookupOpen(true)}
            readOnly={isReadOnly} 
          />
          <FieldRenderer 
            label="Payment Terms" 
            type="lookup" 
            value={form.paytermCode} 
            onLookup={() => !isReadOnly && props.setIsPayTermLookupOpen(true)}
            readOnly={isReadOnly} 
          />
        </Card>
        <RegistrationInfo form={form} />
      </div>
    </div>
  );
});

export default VendSetupTab;