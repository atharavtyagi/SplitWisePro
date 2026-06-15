"""Import processor — orchestrates parse → validate → anomaly detect → import"""
from django.utils import timezone
from django.contrib.auth import get_user_model
from decimal import Decimal, InvalidOperation
from datetime import datetime

from .models import ImportSession, ImportAnomaly
from .csv_parser import CSVParser
from .anomaly_engine import AnomalyPipeline
from expenses.models import Expense, ExpenseParticipant
from groups.models import GroupMember
from audit.utils import log_action, log_activity

User = get_user_model()


class ImportProcessor:
    def __init__(self, session: ImportSession):
        self.session = session
        self.parser = CSVParser()
        self.pipeline = AnomalyPipeline()

    def process(self):
        """Phase 1: Parse CSV + detect all anomalies. Sets status to 'review'."""
        session = self.session
        session.status = 'parsing'
        session.save()

        try:
            rows, global_errors = self.parser.parse(session.file)

            session.total_rows = len(rows)
            session.status = 'validating'
            session.save()

            # Build context for anomaly rules
            context = self._build_context(session.group)

            # Run full anomaly pipeline
            anomalies = self.pipeline.run(rows, context)

            # Save anomalies to DB
            anomaly_objs = []
            for a in anomalies:
                anomaly_objs.append(ImportAnomaly(
                    session=session,
                    row_number=a.row_number,
                    row_number_b=a.row_number_b,
                    issue_type=a.issue_type,
                    description=a.description,
                    suggested_action=a.suggested_action,
                    row_data=a.row_data,
                    row_data_b=a.row_data_b,
                ))
            ImportAnomaly.objects.bulk_create(anomaly_objs)

            # Count valid rows (no anomalies)
            anomalous_rows = {a.row_number for a in anomalies}
            session.valid_rows = sum(1 for r in rows if r['_row_number'] not in anomalous_rows)
            session.error_rows = len([r for r in rows if r.get('_parse_error')])
            session.status = 'review'
            if global_errors:
                session.error_message = '\n'.join(global_errors)
            session.save()

            # Store parsed rows in report_data for later use
            serializable_rows = []
            for r in rows:
                row_copy = {k: str(v) for k, v in r.items() if not k.startswith('_')}
                row_copy['_row_number'] = r['_row_number']
                if r.get('_parsed_date'):
                    row_copy['_parsed_date'] = str(r['_parsed_date'])
                serializable_rows.append(row_copy)
            session.report_data = {'rows': serializable_rows, 'global_errors': global_errors}
            session.save()

        except Exception as e:
            session.status = 'failed'
            session.error_message = str(e)
            session.save()
            raise

    def approve_and_import(self, decisions: dict):
        """Phase 2: User approved. Apply decisions and import clean rows."""
        session = self.session
        session.status = 'importing'
        session.save()

        try:
            # Apply user decisions to anomalies
            for anomaly_id, decision in decisions.items():
                try:
                    anomaly = ImportAnomaly.objects.get(id=anomaly_id, session=session)
                    anomaly.user_decision = decision
                    anomaly.status = 'resolved'
                    anomaly.resolved_at = timezone.now()
                    anomaly.save()
                except ImportAnomaly.DoesNotExist:
                    pass

            # Get rows to skip based on decisions
            rows_to_skip = set()
            for anomaly in session.anomalies.all():
                if anomaly.user_decision in ['ignore', 'skip']:
                    rows_to_skip.add(anomaly.row_number)
                    if anomaly.row_number_b:
                        rows_to_skip.add(anomaly.row_number_b)
                elif anomaly.user_decision == 'keep_first' and anomaly.row_number_b:
                    rows_to_skip.add(anomaly.row_number_b)
                elif anomaly.user_decision == 'keep_second' and anomaly.row_number_b:
                    rows_to_skip.add(anomaly.row_number)

            # Import rows
            rows = session.report_data.get('rows', [])
            imported = 0
            skipped = 0
            errors = []

            for row in rows:
                rn = row['_row_number']
                if rn in rows_to_skip or row.get('_parse_error'):
                    skipped += 1
                    continue
                try:
                    self._create_expense_from_row(row, session.group, session.user)
                    imported += 1
                except Exception as e:
                    errors.append(f"Row {rn}: {str(e)}")
                    skipped += 1

            session.imported_rows = imported
            session.skipped_rows = skipped
            session.status = 'completed'
            session.completed_at = timezone.now()
            session.report_data['import_errors'] = errors
            session.save()

            log_action(session.user, 'import_completed', 'import_session', str(session.id),
                       new_value={'imported': imported, 'skipped': skipped})
            log_activity(session.user, session.group, 'import_completed',
                         f"CSV import completed: {imported} expenses imported, {skipped} skipped")

        except Exception as e:
            session.status = 'failed'
            session.error_message = str(e)
            session.save()
            raise

    def _create_expense_from_row(self, row: dict, group, user):
        """Create Expense + ExpenseParticipant records from a parsed CSV row."""
        from datetime import date as date_type

        # Parse amount
        amount_str = str(row.get('amount', '0')).replace(',', '').strip()
        try:
            amount = Decimal(amount_str)
        except InvalidOperation:
            raise ValueError(f"Invalid amount: {amount_str}")

        # Parse date
        date_str = row.get('_parsed_date') or row.get('date', '')
        if isinstance(date_str, date_type):
            expense_date = date_str
        else:
            from .csv_parser import parse_date
            expense_date, err = parse_date(str(date_str))
            if not expense_date:
                raise ValueError(err)

        # Find paid_by user
        paid_by_name = row.get('paid_by', '').strip().lower()
        paid_by = self._find_user(paid_by_name, group) or user

        split_type = row.get('split_type', 'equal').strip().lower()
        if split_type not in ['equal', 'exact', 'percent', 'shares', 'settlement']:
            split_type = 'equal'

        expense = Expense.objects.create(
            group=group,
            title=row.get('title', 'Untitled Expense')[:300],
            description=row.get('description', ''),
            amount=amount,
            currency=row.get('currency', 'INR').upper()[:3],
            category=row.get('category', 'other'),
            date=expense_date,
            paid_by=paid_by,
            split_type=split_type,
            notes=row.get('notes', ''),
            created_by=user,
        )

        # Create equal split among all active members on that date
        active_members = GroupMember.objects.filter(
            group=group, joined_at__date__lte=expense_date,
        ).filter(
            __import__('django.db.models', fromlist=['Q']).Q(left_at__isnull=True) |
            __import__('django.db.models', fromlist=['Q']).Q(left_at__date__gte=expense_date)
        ).values_list('user_id', flat=True).distinct()

        member_ids = list(active_members)
        if member_ids:
            share = amount / len(member_ids)
            pct = Decimal('100') / len(member_ids)
            for uid in member_ids:
                ExpenseParticipant.objects.create(
                    expense=expense, user_id=uid,
                    share_amount=share, share_percent=pct, shares=1
                )

        return expense

    def _find_user(self, name_or_email: str, group):
        """Find a user by name or email within the group."""
        members = GroupMember.objects.filter(group=group).select_related('user')
        for m in members:
            u = m.user
            if (u.email.lower() == name_or_email or
                    u.get_full_name().lower() == name_or_email or
                    u.username.lower() == name_or_email):
                return u
        return None

    def _build_context(self, group) -> dict:
        """Build context dictionary for anomaly rules."""
        members = GroupMember.objects.filter(group=group).select_related('user')
        member_names = []
        member_emails = []
        memberships = []
        for m in members:
            name = m.user.get_full_name().lower()
            email = m.user.email.lower()
            if name:
                member_names.append(name)
            member_emails.append(email)
            memberships.append({
                'name': name,
                'email': email,
                'joined_at': m.joined_at.date() if m.joined_at else None,
                'left_at': m.left_at.date() if m.left_at else None,
            })
        return {
            'group_id': str(group.id),
            'member_names': member_names,
            'member_emails': member_emails,
            'memberships': memberships,
        }

    def generate_report(self) -> dict:
        session = self.session
        anomalies = session.anomalies.all()
        return {
            'session_id': str(session.id),
            'filename': session.original_filename,
            'group': str(session.group_id),
            'status': session.status,
            'total_rows': session.total_rows,
            'imported_rows': session.imported_rows,
            'skipped_rows': session.skipped_rows,
            'error_rows': session.error_rows,
            'anomalies_found': anomalies.count(),
            'duplicates_found': anomalies.filter(issue_type='duplicate').count(),
            'near_duplicates_found': anomalies.filter(issue_type='near_duplicate').count(),
            'refunds_found': anomalies.filter(issue_type='refund').count(),
            'settlements_found': anomalies.filter(issue_type='settlement_as_expense').count(),
            'warnings': list(anomalies.filter(
                issue_type__in=['future_date', 'negative_amount', 'outside_membership']
            ).values_list('description', flat=True)),
            'errors': list(anomalies.filter(
                issue_type__in=['malformed_row', 'missing_field']
            ).values_list('description', flat=True)),
            'import_errors': session.report_data.get('import_errors', []) if session.report_data else [],
            'completed_at': str(session.completed_at) if session.completed_at else None,
        }
