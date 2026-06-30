-- Add blocker_type column to daily_report_tasks table
ALTER TABLE daily_report_tasks 
ADD COLUMN blocker_type ENUM(
  'waiting_for_approval',
  'waiting_for_resources', 
  'technical_dependency',
  'external_dependency',
  'missing_requirements',
  'environment_issues',
  'access_permissions',
  'third_party_integration',
  'performance_issues',
  'other'
) NULL AFTER completion_percentage;