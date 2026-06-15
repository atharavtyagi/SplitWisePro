# CSV Import Report

**Import Session ID:** `8f4b29c1-4a3e-4b2a-9e1d-3b8c4d7f9a2e`
**Group:** Goa Trip 2026
**File:** `expenses_export_final.csv`
**Date Processed:** 2026-06-15
**Status:** Completed (with user review)

## Summary
- **Total Rows Processed:** 45
- **Valid Rows Automatically Imported:** 40
- **Anomalies Detected:** 5
- **Skipped/Discarded Rows:** 1
- **Total Successfully Imported:** 44

---

## Anomaly Details & Actions Taken

### 1. Row 12: Negative Amount
- **Expense Title:** "Hotel Deposit Return"
- **Anomaly Detected:** `negative_amount`
- **Description:** Row 12 has a negative amount (-5000.00). This may be a refund or data error.
- **Action Taken:** User marked as `refund`. Amount converted to positive and expense flagged as a refund in the database.

### 2. Row 24: Unknown Member
- **Expense Title:** "Dinner at Shack"
- **Anomaly Detected:** `unknown_member`
- **Description:** `paid_by` value 'Rahul' does not match any current group member.
- **Action Taken:** User selected `accept` and mapped 'Rahul' to the existing member profile 'Rahul M'.

### 3. Row 31: Duplicate Expense
- **Expense Title:** "Cab to Airport"
- **Anomaly Detected:** `duplicate`
- **Description:** Rows 30 and 31 appear to be exact duplicates: 'Cab to Airport' on 2026-06-10 for 1200.00 paid by Alice.
- **Action Taken:** User selected `keep_first`. Row 31 was skipped and not imported.

### 4. Row 38: Settlement as Expense
- **Expense Title:** "Paid back Bob for drinks"
- **Anomaly Detected:** `settlement_as_expense`
- **Description:** 'Paid back Bob for drinks' looks like a settlement payment, not an shared expense.
- **Action Taken:** User selected `accept`. Transaction was converted from a shared expense into a direct settlement payment from the payer to Bob.

### 5. Row 42: Invalid Split Values
- **Expense Title:** "Concert Tickets"
- **Anomaly Detected:** `invalid_split`
- **Description:** Split type is 'exact', but participant share amounts sum to 8000.00, while total expense is 8500.00.
- **Action Taken:** User selected `accept` after modifying the data. Corrected Bob's share from 2000.00 to 2500.00 to balance the total.
