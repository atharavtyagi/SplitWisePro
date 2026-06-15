"""
CSV Import Anomaly Detection Engine.
Extensible pipeline — add new rules by subclassing AnomalyRule.
Each rule is independent and focuses on one type of anomaly.
"""
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
import re
from difflib import SequenceMatcher


VALID_CURRENCIES = {'INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'SGD', 'AUD', 'CAD', 'CHF', 'NZD', 'HKD'}
REQUIRED_FIELDS = ['title', 'amount', 'date', 'paid_by']


@dataclass
class AnomalyResult:
    row_number: int
    issue_type: str
    description: str
    suggested_action: str
    row_data: Dict
    row_number_b: Optional[int] = None
    row_data_b: Optional[Dict] = None


class AnomalyRule:
    """Base class — subclass and implement check()."""
    def check(self, rows: List[Dict], context: Dict) -> List[AnomalyResult]:
        raise NotImplementedError


# ─── Rule 1: Malformed Rows ──────────────────────────────────────────────────
class MalformedRowRule(AnomalyRule):
    def check(self, rows, context):
        anomalies = []
        for row in rows:
            if row.get('_parse_error'):
                anomalies.append(AnomalyResult(
                    row_number=row['_row_number'],
                    issue_type='malformed_row',
                    description=f"Row {row['_row_number']} could not be parsed: {row.get('_parse_error')}",
                    suggested_action='Skip this row — it contains invalid data format.',
                    row_data=row,
                ))
        return anomalies


# ─── Rule 2: Missing Required Fields ─────────────────────────────────────────
class MissingFieldRule(AnomalyRule):
    def check(self, rows, context):
        anomalies = []
        for row in rows:
            if row.get('_parse_error'):
                continue
            missing = [f for f in REQUIRED_FIELDS if not row.get(f, '').strip()]
            if missing:
                anomalies.append(AnomalyResult(
                    row_number=row['_row_number'],
                    issue_type='missing_field',
                    description=f"Row {row['_row_number']} is missing required fields: {', '.join(missing)}",
                    suggested_action=f"Provide values for: {', '.join(missing)} before importing.",
                    row_data=row,
                ))
        return anomalies


# ─── Rule 3: Negative Amounts ─────────────────────────────────────────────────
class NegativeAmountRule(AnomalyRule):
    def check(self, rows, context):
        anomalies = []
        for row in rows:
            if row.get('_parse_error'):
                continue
            try:
                amt = float(row.get('amount', 0))
                if amt < 0:
                    anomalies.append(AnomalyResult(
                        row_number=row['_row_number'],
                        issue_type='negative_amount',
                        description=f"Row {row['_row_number']} has a negative amount ({amt}). This may be a refund or data error.",
                        suggested_action='If this is a refund, mark it as such. Otherwise, correct the amount.',
                        row_data=row,
                    ))
            except (ValueError, TypeError):
                pass
        return anomalies


# ─── Rule 4: Future Dates ─────────────────────────────────────────────────────
class FutureDateRule(AnomalyRule):
    def check(self, rows, context):
        anomalies = []
        today = date.today()
        for row in rows:
            if row.get('_parse_error'):
                continue
            parsed_date = row.get('_parsed_date')
            if parsed_date and parsed_date > today:
                anomalies.append(AnomalyResult(
                    row_number=row['_row_number'],
                    issue_type='future_date',
                    description=f"Row {row['_row_number']} has a future date: {row.get('date')}.",
                    suggested_action='Verify the date. If correct, you may still import this expense.',
                    row_data=row,
                ))
        return anomalies


# ─── Rule 5: Invalid Currency ─────────────────────────────────────────────────
class InvalidCurrencyRule(AnomalyRule):
    def check(self, rows, context):
        anomalies = []
        for row in rows:
            if row.get('_parse_error'):
                continue
            currency = row.get('currency', 'INR').strip().upper()
            if currency and currency not in VALID_CURRENCIES:
                anomalies.append(AnomalyResult(
                    row_number=row['_row_number'],
                    issue_type='invalid_currency',
                    description=f"Row {row['_row_number']} has unrecognized currency code: '{currency}'.",
                    suggested_action=f"Replace with a valid code: {', '.join(sorted(VALID_CURRENCIES))}.",
                    row_data=row,
                ))
        return anomalies


# ─── Rule 6: Unknown Members ──────────────────────────────────────────────────
class UnknownMemberRule(AnomalyRule):
    def check(self, rows, context):
        anomalies = []
        known_names = {n.lower() for n in context.get('member_names', [])}
        known_emails = {e.lower() for e in context.get('member_emails', [])}

        for row in rows:
            if row.get('_parse_error'):
                continue
            paid_by = row.get('paid_by', '').strip().lower()
            if paid_by and paid_by not in known_names and paid_by not in known_emails:
                anomalies.append(AnomalyResult(
                    row_number=row['_row_number'],
                    issue_type='unknown_member',
                    description=f"Row {row['_row_number']}: 'paid_by' value '{row.get('paid_by')}' does not match any group member.",
                    suggested_action='Check spelling or invite this person to the group before importing.',
                    row_data=row,
                ))
        return anomalies


# ─── Rule 7: Outside Membership Period ───────────────────────────────────────
class OutsideMembershipRule(AnomalyRule):
    def check(self, rows, context):
        anomalies = []
        memberships = context.get('memberships', [])  # [{name, email, joined_at, left_at}]

        for row in rows:
            if row.get('_parse_error'):
                continue
            paid_by = row.get('paid_by', '').strip().lower()
            expense_date = row.get('_parsed_date')
            if not expense_date:
                continue

            for m in memberships:
                names = {m.get('name', '').lower(), m.get('email', '').lower()}
                if paid_by in names:
                    joined = m.get('joined_at')
                    left = m.get('left_at')
                    if joined and expense_date < joined:
                        anomalies.append(AnomalyResult(
                            row_number=row['_row_number'],
                            issue_type='outside_membership',
                            description=f"Row {row['_row_number']}: '{row.get('paid_by')}' was not yet a member on {expense_date} (joined {joined}).",
                            suggested_action='Verify the expense date or the member\'s join date.',
                            row_data=row,
                        ))
                    elif left and expense_date > left:
                        anomalies.append(AnomalyResult(
                            row_number=row['_row_number'],
                            issue_type='outside_membership',
                            description=f"Row {row['_row_number']}: '{row.get('paid_by')}' had already left the group on {expense_date} (left {left}).",
                            suggested_action='This expense may not apply to this member. Review carefully.',
                            row_data=row,
                        ))
        return anomalies


# ─── Rule 8: Missing Participants ────────────────────────────────────────────
class MissingParticipantsRule(AnomalyRule):
    def check(self, rows, context):
        anomalies = []
        for row in rows:
            if row.get('_parse_error'):
                continue
            participants = row.get('participants', '').strip()
            if not participants:
                anomalies.append(AnomalyResult(
                    row_number=row['_row_number'],
                    issue_type='missing_participants',
                    description=f"Row {row['_row_number']}: No participants listed. Cannot determine who shares this expense.",
                    suggested_action='Add participant names/emails, or leave blank for equal split among all current members.',
                    row_data=row,
                ))
        return anomalies


# ─── Rule 9: Invalid Split Values ────────────────────────────────────────────
class InvalidSplitRule(AnomalyRule):
    def check(self, rows, context):
        anomalies = []
        for row in rows:
            if row.get('_parse_error'):
                continue
            split_type = row.get('split_type', 'equal').strip().lower()
            try:
                amount = float(row.get('amount', 0))
            except (ValueError, TypeError):
                continue

            if split_type == 'percent':
                percentages_str = row.get('percentages', '')
                if percentages_str:
                    try:
                        total = sum(float(p.strip()) for p in percentages_str.split(',') if p.strip())
                        if abs(total - 100) > 0.01:
                            anomalies.append(AnomalyResult(
                                row_number=row['_row_number'],
                                issue_type='invalid_split',
                                description=f"Row {row['_row_number']}: Percentages sum to {total:.2f}%, not 100%.",
                                suggested_action='Adjust percentages so they total exactly 100%.',
                                row_data=row,
                            ))
                    except ValueError:
                        pass

            elif split_type == 'exact':
                shares_str = row.get('shares', '')
                if shares_str:
                    try:
                        total = sum(float(s.strip()) for s in shares_str.split(',') if s.strip())
                        if abs(total - amount) > 0.01:
                            anomalies.append(AnomalyResult(
                                row_number=row['_row_number'],
                                issue_type='invalid_split',
                                description=f"Row {row['_row_number']}: Share amounts sum to {total:.2f}, but expense is {amount:.2f}.",
                                suggested_action='Ensure share amounts add up to the total expense amount.',
                                row_data=row,
                            ))
                    except ValueError:
                        pass
        return anomalies


# ─── Rule 10: Refund Detection ────────────────────────────────────────────────
class RefundDetectionRule(AnomalyRule):
    REFUND_KEYWORDS = {'refund', 'return', 'cashback', 'reimbursement', 'credit', 'reversal'}

    def check(self, rows, context):
        anomalies = []
        for row in rows:
            if row.get('_parse_error'):
                continue
            title = row.get('title', '').lower()
            if any(kw in title for kw in self.REFUND_KEYWORDS):
                anomalies.append(AnomalyResult(
                    row_number=row['_row_number'],
                    issue_type='refund',
                    description=f"Row {row['_row_number']}: '{row.get('title')}' appears to be a refund or reimbursement.",
                    suggested_action='Mark as a refund or skip this row if it was already handled.',
                    row_data=row,
                ))
        return anomalies


# ─── Rule 11: Settlement as Expense ──────────────────────────────────────────
class SettlementAsExpenseRule(AnomalyRule):
    SETTLEMENT_KEYWORDS = {'settlement', 'paid back', 'transfer', 'payment to', 'money transfer', 'upi'}

    def check(self, rows, context):
        anomalies = []
        for row in rows:
            if row.get('_parse_error'):
                continue
            title = row.get('title', '').lower()
            if any(kw in title for kw in self.SETTLEMENT_KEYWORDS):
                anomalies.append(AnomalyResult(
                    row_number=row['_row_number'],
                    issue_type='settlement_as_expense',
                    description=f"Row {row['_row_number']}: '{row.get('title')}' looks like a settlement payment, not an expense.",
                    suggested_action='Import this as a Settlement instead of an Expense to correctly track repayments.',
                    row_data=row,
                ))
        return anomalies


# ─── Rule 12: Exact Duplicates ───────────────────────────────────────────────
class DuplicateExpenseRule(AnomalyRule):
    def check(self, rows, context):
        anomalies = []
        seen = {}
        for row in rows:
            if row.get('_parse_error'):
                continue
            key = (
                row.get('title', '').lower().strip(),
                row.get('amount', '').strip(),
                row.get('date', '').strip(),
                row.get('paid_by', '').lower().strip(),
            )
            n = row['_row_number']
            if key in seen:
                prev_n, prev_row = seen[key]
                anomalies.append(AnomalyResult(
                    row_number=prev_n,
                    row_number_b=n,
                    issue_type='duplicate',
                    description=f"Rows {prev_n} and {n} appear to be exact duplicates: '{row.get('title')}' on {row.get('date')} for {row.get('amount')}.",
                    suggested_action='Keep one row or merge them. Do not import both.',
                    row_data=prev_row,
                    row_data_b=row,
                ))
            else:
                seen[key] = (n, row)
        return anomalies


# ─── Rule 13: Near Duplicates ─────────────────────────────────────────────────
class NearDuplicateRule(AnomalyRule):
    SIMILARITY_THRESHOLD = 0.8

    def check(self, rows, context):
        anomalies = []
        clean = [r for r in rows if not r.get('_parse_error')]
        flagged = set()

        for i in range(len(clean)):
            for j in range(i + 1, len(clean)):
                ri, rj = clean[i], clean[j]
                if (ri['_row_number'], rj['_row_number']) in flagged:
                    continue
                # Same date, similar title, different amount
                if ri.get('date') == rj.get('date'):
                    title_sim = SequenceMatcher(
                        None, ri.get('title', '').lower(), rj.get('title', '').lower()
                    ).ratio()
                    if title_sim >= self.SIMILARITY_THRESHOLD and ri.get('amount') != rj.get('amount'):
                        flagged.add((ri['_row_number'], rj['_row_number']))
                        try:
                            diff = abs(float(ri.get('amount', 0)) - float(rj.get('amount', 0)))
                        except ValueError:
                            diff = 0
                        anomalies.append(AnomalyResult(
                            row_number=ri['_row_number'],
                            row_number_b=rj['_row_number'],
                            issue_type='near_duplicate',
                            description=f"Rows {ri['_row_number']} and {rj['_row_number']} may represent the same event '{ri.get('title')}' (similarity: {title_sim:.0%}) but differ by {diff:.2f} in amount.",
                            suggested_action='Review both rows. If same event, keep the correct one or merge.',
                            row_data=ri,
                            row_data_b=rj,
                        ))
        return anomalies


# ─── Rule 14: Same Event ─────────────────────────────────────────────────────
class SameEventRule(AnomalyRule):
    """Detect multiple expenses that likely represent the same real-world event."""
    def check(self, rows, context):
        anomalies = []
        clean = [r for r in rows if not r.get('_parse_error')]
        flagged = set()

        for i in range(len(clean)):
            for j in range(i + 1, len(clean)):
                ri, rj = clean[i], clean[j]
                if (ri['_row_number'], rj['_row_number']) in flagged:
                    continue
                # Same date, same paid_by, very similar title
                if (ri.get('date') == rj.get('date') and
                        ri.get('paid_by', '').lower() == rj.get('paid_by', '').lower()):
                    sim = SequenceMatcher(
                        None, ri.get('title', '').lower(), rj.get('title', '').lower()
                    ).ratio()
                    if sim >= 0.9 and ri.get('amount') == rj.get('amount'):
                        flagged.add((ri['_row_number'], rj['_row_number']))
                        anomalies.append(AnomalyResult(
                            row_number=ri['_row_number'],
                            row_number_b=rj['_row_number'],
                            issue_type='same_event',
                            description=f"Rows {ri['_row_number']} and {rj['_row_number']} appear to be the exact same event: '{ri.get('title')}' on {ri.get('date')} paid by {ri.get('paid_by')}.",
                            suggested_action='These are almost certainly duplicates. Keep only one.',
                            row_data=ri,
                            row_data_b=rj,
                        ))
        return anomalies


# ─── Rule 15: Incorrect Total ─────────────────────────────────────────────────
class IncorrectTotalRule(AnomalyRule):
    def check(self, rows, context):
        anomalies = []
        for row in rows:
            if row.get('_parse_error'):
                continue
            shares_str = row.get('shares', '').strip()
            split_type = row.get('split_type', '').strip().lower()
            if split_type == 'exact' and shares_str:
                try:
                    amount = float(row.get('amount', 0))
                    total_shares = sum(float(s.strip()) for s in shares_str.split(',') if s.strip())
                    if abs(total_shares - amount) > 0.01:
                        anomalies.append(AnomalyResult(
                            row_number=row['_row_number'],
                            issue_type='incorrect_total',
                            description=f"Row {row['_row_number']}: Participant shares ({total_shares:.2f}) do not match total ({amount:.2f}). Difference: {abs(total_shares - amount):.2f}.",
                            suggested_action='Correct the share amounts to exactly match the expense total.',
                            row_data=row,
                        ))
                except (ValueError, TypeError):
                    pass
        return anomalies


# ─── Pipeline ─────────────────────────────────────────────────────────────────
class AnomalyPipeline:
    """
    Runs all anomaly detection rules in sequence.
    To add a new rule: create a class extending AnomalyRule and add it to the list.
    """
    rules: List[AnomalyRule] = [
        MalformedRowRule(),
        MissingFieldRule(),
        NegativeAmountRule(),
        FutureDateRule(),
        InvalidCurrencyRule(),
        UnknownMemberRule(),
        OutsideMembershipRule(),
        MissingParticipantsRule(),
        IncorrectTotalRule(),
        InvalidSplitRule(),
        RefundDetectionRule(),
        SettlementAsExpenseRule(),
        DuplicateExpenseRule(),
        NearDuplicateRule(),
        SameEventRule(),
    ]

    def run(self, rows: List[Dict], context: Dict) -> List[AnomalyResult]:
        anomalies = []
        for rule in self.rules:
            try:
                anomalies.extend(rule.check(rows, context))
            except Exception as e:
                # Never crash — log the rule failure and continue
                import logging
                logging.getLogger(__name__).error(f"Anomaly rule {rule.__class__.__name__} failed: {e}")
        return anomalies
