"""
CSV Parser — robustly parses expense CSV files.
- Auto-detects delimiter
- Handles BOM, encoding issues
- Normalizes column names
- Maps common aliases
- Never crashes — wraps per-row errors
"""
import csv
import io
from datetime import datetime, date
from typing import List, Dict, Tuple


COLUMN_ALIASES = {
    'expense_name': 'title', 'name': 'title', 'expense': 'title', 'description_short': 'title',
    'cost': 'amount', 'total': 'amount', 'price': 'amount', 'value': 'amount',
    'payer': 'paid_by', 'paid by': 'paid_by', 'who_paid': 'paid_by', 'paid_by_name': 'paid_by',
    'note': 'notes', 'comment': 'notes', 'remarks': 'notes',
    'type': 'category', 'expense_type': 'category',
    'split': 'split_type', 'split_method': 'split_type',
    'members': 'participants', 'people': 'participants', 'shared_with': 'participants',
    'currency_code': 'currency',
}

DATE_FORMATS = [
    '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y',
    '%Y/%m/%d', '%d %b %Y', '%d %B %Y', '%b %d %Y',
    '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%SZ',
]


def detect_delimiter(sample: str) -> str:
    """Auto-detect CSV delimiter from sample text."""
    counts = {d: sample.count(d) for d in [',', ';', '\t', '|']}
    return max(counts, key=counts.get)


def normalize_column_name(col: str) -> str:
    """Normalize column name: strip, lowercase, replace spaces/hyphens with underscore."""
    col = col.strip().lower().replace(' ', '_').replace('-', '_').replace('(', '').replace(')', '')
    return COLUMN_ALIASES.get(col, col)


def parse_date(date_str: str) -> Tuple[date, None] | Tuple[None, str]:
    """Try multiple date formats. Returns (date, None) or (None, error)."""
    date_str = date_str.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(date_str, fmt).date(), None
        except ValueError:
            continue
    return None, f"Cannot parse date '{date_str}'"


class CSVParser:
    def parse(self, file_obj) -> Tuple[List[Dict], List[str]]:
        """
        Parse a CSV file into a list of row dicts with metadata.
        Returns: (rows, global_errors)
        Each row has _row_number, _parsed_date, and optionally _parse_error.
        Never raises — all errors are captured in return values.
        """
        rows = []
        global_errors = []

        try:
            # Read and decode
            raw = file_obj.read()
            # Handle BOM
            if isinstance(raw, bytes):
                try:
                    content = raw.decode('utf-8-sig')
                except UnicodeDecodeError:
                    content = raw.decode('latin-1')
            else:
                content = raw

            # Remove BOM if present
            content = content.lstrip('\ufeff')

            if not content.strip():
                return [], ['CSV file is empty.']

            sample = content[:2000]
            delimiter = detect_delimiter(sample)

            reader = csv.DictReader(io.StringIO(content), delimiter=delimiter)

            if not reader.fieldnames:
                return [], ['CSV file has no headers.']

            # Normalize headers
            normalized_fields = {col: normalize_column_name(col) for col in reader.fieldnames}

            for row_idx, raw_row in enumerate(reader, start=2):  # row 1 is header
                try:
                    # Normalize column names
                    row = {normalized_fields.get(k, normalize_column_name(k or '')): (v or '').strip()
                           for k, v in raw_row.items() if k}
                    row['_row_number'] = row_idx

                    # Parse date
                    date_str = row.get('date', '').strip()
                    if date_str:
                        parsed_date, date_err = parse_date(date_str)
                        if parsed_date:
                            row['_parsed_date'] = parsed_date
                        else:
                            row['_parse_error'] = date_err
                    else:
                        row['_parsed_date'] = None

                    # Validate amount is numeric
                    amount_str = row.get('amount', '').strip().replace(',', '').replace('₹', '').replace('$', '').replace('€', '')
                    if amount_str:
                        try:
                            row['amount'] = amount_str  # Keep as string, parse later
                            float(amount_str)  # Just validate
                        except ValueError:
                            row['_parse_error'] = f"Cannot parse amount '{row.get('amount')}'"

                    rows.append(row)

                except Exception as e:
                    rows.append({
                        '_row_number': row_idx,
                        '_parse_error': f"Row parsing failed: {str(e)}",
                        **{k: v for k, v in raw_row.items() if k},
                    })

        except Exception as e:
            global_errors.append(f"File could not be read: {str(e)}")

        return rows, global_errors
