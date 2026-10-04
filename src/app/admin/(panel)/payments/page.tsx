import type { Metadata } from "next";
import { savePaymentAccount } from "@/app/actions/admin-store";
import { ActionForm } from "@/components/admin/action-form";
import { Check, Field, Input, PageHeader, Panel, Pill, Textarea } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Payment accounts" };

const LABEL = { jazzcash: "JazzCash", easypaisa: "Easypaisa", bank_transfer: "Bank transfer" } as const;

export default async function PaymentsPage() {
  const { supabase } = await requireAdmin();
  const { data: accounts } = await supabase.from("payment_accounts").select("*").order("sort");

  return (
    <>
      <PageHeader
        title="Payment accounts"
        description="Cash on delivery is always available. Turn on a method below and customers can pay by transfer, then send you the transaction ID and a screenshot to verify."
      />

      <div className="space-y-6">
        {accounts?.map((a) => {
          const label = LABEL[a.method as keyof typeof LABEL] ?? a.method;
          const isBank = a.method === "bank_transfer";
          return (
            <Panel
              key={a.id}
              title={label}
              actions={a.is_active ? <Pill tone="good">On at checkout</Pill> : <Pill>Off</Pill>}
            >
              <ActionForm action={savePaymentAccount}>
                <input type="hidden" name="id" value={a.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Account title" htmlFor={`t${a.id}`} hint="The name on the account.">
                    <Input id={`t${a.id}`} name="accountTitle" defaultValue={a.account_title ?? ""} />
                  </Field>
                  <Field label={isBank ? "Account number" : "Mobile account number"} htmlFor={`n${a.id}`}>
                    <Input id={`n${a.id}`} name="accountNumber" defaultValue={a.account_number ?? ""} inputMode="numeric" />
                  </Field>
                </div>
                {isBank && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Bank name" htmlFor={`b${a.id}`}>
                      <Input id={`b${a.id}`} name="bankName" defaultValue={a.bank_name ?? ""} />
                    </Field>
                    <Field label="IBAN" htmlFor={`i${a.id}`}>
                      <Input id={`i${a.id}`} name="iban" defaultValue={a.iban ?? ""} />
                    </Field>
                  </div>
                )}
                <Field label="Instructions for the customer" htmlFor={`ins${a.id}`} hint="Optional, e.g. Please send the exact amount and keep the receipt.">
                  <Textarea id={`ins${a.id}`} name="instructions" rows={2} defaultValue={a.instructions ?? ""} />
                </Field>
                <Check name="isActive" label="Offer this method at checkout" defaultChecked={a.is_active} />
              </ActionForm>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
