# Scope & Anomaly Log

## Anomaly Log

The CSV Importer contains an extensible `AnomalyPipeline` designed to identify and flag inconsistencies in bulk expense data. Each anomaly is logged to the database so the user can interactively resolve them.

| Anomaly Type | Data Problem Found | How it is Handled / Suggested Action |
| --- | --- | --- |
| `malformed_row` | CSV row couldn't be parsed correctly. | Skipped automatically; user notified. |
| `missing_field` | Required fields (title, amount, date, paid_by) are blank. | Flagged; user must provide values before import. |
| `negative_amount` | Amount is < 0. | Flagged; user can mark as refund or correct amount. |
| `future_date` | Date of expense is in the future. | Flagged; user must verify date. |
| `invalid_currency` | Currency code not in valid list (INR, USD, etc.). | Flagged; user must select valid currency. |
| `unknown_member` | `paid_by` does not match any group member. | Flagged; user must fix spelling or invite member. |
| `outside_membership`| Expense date falls outside the member's join/leave dates. | Flagged; user must verify if expense applies to them. |
| `missing_participants`| No participants listed for the expense. | Flagged; user can leave blank to split equally among all. |
| `invalid_split` | Percentages don't sum to 100%, or exact amounts don't sum to total. | Flagged; user must adjust splits to match. |
| `refund` | Title contains keywords like "refund", "return", "cashback". | Flagged; user can mark as a refund transaction. |
| `settlement_as_expense` | Title contains keywords like "settlement", "paid back". | Flagged; user can import as Settlement. |
| `duplicate` | Exact same title, amount, date, and payer as another row. | Flagged; user can keep one or merge. |
| `near_duplicate` | Same date, similar title, but different amount. | Flagged; user must review both rows. |
| `same_event` | Same date, same payer, similar title, same amount. | Flagged; user must review and keep one. |
| `incorrect_total` | Participant shares don't add up to the total expense. | Flagged; user must correct share amounts. |

---

## Database Schema Highlights

### `imports` App
- **`ImportSession`**: Tracks the entire CSV upload event.
  - `id`, `user_id`, `group_id`, `file`, `status` (uploaded, parsing, review, completed), `total_rows`, `valid_rows`, `error_rows`.
- **`ImportAnomaly`**: Tracks individual problems inside a session.
  - `id`, `session_id`, `row_number`, `issue_type`, `description`, `row_data` (JSON), `user_decision` (keep_first, merge, ignore, skip), `status`.

### `expenses` App
- **`Expense`**: The core expense record.
  - `id`, `group_id`, `title`, `amount`, `currency`, `category`, `date`, `paid_by`, `split_type` (equal, exact, percent, shares), `is_settlement`.
- **`ExpenseParticipant`**: Associates users with an expense and their share.
  - `id`, `expense_id`, `user_id`, `share_amount`, `share_percent`, `shares`.

### `groups` App
- **`Group`**: The shared space for users.
  - `id`, `name`, `description`, `currency`, `created_at`.
- **`GroupMembership`**: Links users to groups with join/leave dates.
  - `id`, `group_id`, `user_id`, `joined_at`, `left_at`, `role`.
