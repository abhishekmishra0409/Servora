'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { ChangePasswordForm } from '@/components/change-password-form';
import { useConfirm } from '@/components/confirm-dialog';
import { NoticeBanner } from '@/components/error-state';
import { FormActions, FormField } from '@/components/form-field';
import { SectionCard } from '@/components/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { PlatformPage } from './platform-page';

export function SettingsView(): ReactNode {
  const confirm = useConfirm();
  const [displayName, setDisplayName] = useState('Servora');
  const [supportEmail, setSupportEmail] = useState('');
  const [memo, setMemo] = useState('');
  const [maintenance, setMaintenance] = useState(false);
  const [betaFlags, setBetaFlags] = useState(true);

  return (
    <PlatformPage description="Platform defaults and controls, plus your own account security." title="Platform settings">
      <NoticeBanner tone="info">
        Platform settings are not persisted by the API yet. Changes here apply to this session only.
      </NoticeBanner>

      <section className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="General">
          <FormField htmlFor="platform-name" label="Platform display name">
            <Input id="platform-name" onChange={(event) => setDisplayName(event.target.value)} value={displayName} />
          </FormField>
          <FormField htmlFor="platform-support" label="Global support email">
            <Input id="platform-support" onChange={(event) => setSupportEmail(event.target.value)} placeholder="support@example.com" type="email" value={supportEmail} />
          </FormField>
          <FormField htmlFor="platform-memo" label="Administrative memo">
            <Textarea id="platform-memo" onChange={(event) => setMemo(event.target.value)} placeholder="Notes for the platform admin team." rows={4} value={memo} />
          </FormField>
          <FormActions>
            <Button onClick={() => toast.success('Platform settings saved for this session')} type="button">
              Save settings
            </Button>
          </FormActions>
        </SectionCard>

        <SectionCard title="System controls">
          <label className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
            <span>
              <span className="block font-medium">Beta feature flagging</span>
              <span className="text-xs text-muted-foreground">Let tenants opt into features still in beta.</span>
            </span>
            <Switch checked={betaFlags} onCheckedChange={setBetaFlags} />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
            <span>
              <span className="block font-medium">Global maintenance mode</span>
              <span className="text-xs text-muted-foreground">Show a maintenance notice to every workspace.</span>
            </span>
            <Switch
              checked={maintenance}
              onCheckedChange={(checked) => {
                if (!checked) {
                  setMaintenance(false);
                  return;
                }
                void confirm({
                  confirmLabel: 'Turn on maintenance',
                  description: 'Every restaurant workspace will show a maintenance notice.',
                  title: 'Enable global maintenance mode?',
                  tone: 'warning',
                }).then((ok) => setMaintenance(ok));
              }}
            />
          </label>
        </SectionCard>

        <ChangePasswordForm />
      </section>
    </PlatformPage>
  );
}
