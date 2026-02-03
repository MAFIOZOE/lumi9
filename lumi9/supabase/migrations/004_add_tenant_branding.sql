-- Add branding column to tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{
  "brandName": "Lumi9",
  "tagline": "Your AI Workforce",
  "logoUrl": null,
  "faviconUrl": null,
  "primaryColor": "#6366F1",
  "accentColor": "#22D3EE",
  "theme": "dark"
}'::jsonb;
