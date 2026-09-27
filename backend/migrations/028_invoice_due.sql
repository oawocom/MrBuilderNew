-- 028: invoice due days (admin setting)
INSERT INTO platform_settings (key, value, description) VALUES
 ('invoice_due_days', '7', 'Days after issue until a pending invoice is due (shown as due date / overdue in the apps)')
ON CONFLICT (key) DO NOTHING;
