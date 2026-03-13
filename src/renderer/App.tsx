import { AlertTriangle, CheckCircle2, Database, FolderLock, RefreshCw, ShieldCheck } from 'lucide-react';

import { DefaultLayout } from '@/renderer/layouts/DefaultLayout';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import './globals.css';
import './App.css';

function statusVariant(status: 'ready' | 'blocked' | 'active' | 'signed-out' | 'reauth-required') {
  return status === 'ready' || status === 'active' ? 'default' : 'outline';
}

export default function App() {
  const { state, isLoading, error, refresh } = useAppBootstrap();

  return (
    <DefaultLayout>
      <div className="flex flex-1 flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-slate-200/80 bg-white/80 px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={statusVariant(state.app.status)}>
                {state.app.isLocked ? 'App gesperrt' : 'App bereit'}
              </Badge>
              <Badge variant={statusVariant(state.auth.status)}>
                {state.auth.status}
              </Badge>
              <Badge variant={state.backup.isBackupRequired ? 'outline' : 'default'}>
                {state.backup.isBackupRequired ? 'Backup offen' : 'Backup sauber'}
              </Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Apprenticeship Reports Logic Shell
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Dieser Stand priorisiert die Anwendungslogik: Session-Policy, Drive-Gating,
                Backup-Regeln, Settings-Import-Preview und Wochenbericht-Hashing.
              </p>
            </div>
          </div>
          <Button onClick={() => void refresh()} disabled={isLoading} className="self-start lg:self-auto">
            <RefreshCw className={isLoading ? 'animate-spin' : undefined} />
            Status aktualisieren
          </Button>
        </header>

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Bootstrap-Fehler</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {state.app.isLocked ? (
          <Alert>
            <FolderLock />
            <AlertTitle>Aktuelle Sperrgruende</AlertTitle>
            <AlertDescription>
              <div className="flex flex-wrap gap-2">
                {state.app.lockReasons.map((reason) => (
                  <Badge key={reason} variant="outline">
                    {reason}
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Bootstrap erfolgreich</AlertTitle>
            <AlertDescription>
              Die Kernlogik meldet aktuell keinen blockierenden Lock-State.
            </AlertDescription>
          </Alert>
        )}

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="border-slate-200/80 bg-white/85 shadow-lg shadow-slate-900/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-950">
                <ShieldCheck className="size-5 text-slate-700" />
                Authentifizierung
              </CardTitle>
              <CardDescription>
                Passwort- oder Google-Session mit Remember-Me-Policy und 30-Tage-Reauth-Fenster.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-4">
                <span>Status</span>
                <Badge variant={statusVariant(state.auth.status)}>{state.auth.status}</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Login-Methode</span>
                <span>{state.auth.provider ?? 'keine'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Persistierte Session</span>
                <span>{state.auth.shouldPersist ? 'ja' : 'nein'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Passwort eingerichtet</span>
                <span>{state.auth.passwordConfigured ? 'ja' : 'nein'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Reauth spaetestens</span>
                <span>{state.auth.expiresAt ?? 'offen'}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/85 shadow-lg shadow-slate-900/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-950">
                <Database className="size-5 text-slate-700" />
                Sperrlogik
              </CardTitle>
              <CardDescription>
                Datenbank-Zugriff bleibt logisch an den Login gebunden.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-4">
                <span>Datenbankstatus</span>
                <Badge variant={state.database.isLocked ? 'outline' : 'default'}>
                  {state.database.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Drive-Status</span>
                <Badge variant={state.drive.isLocked ? 'outline' : 'default'}>
                  {state.drive.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Drive-Konto</span>
                <span>{state.drive.connectedAccountEmail ?? 'nicht verbunden'}</span>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Fehlende Scopes
                </p>
                <div className="flex flex-wrap gap-2">
                  {state.drive.missingScopes.length ? (
                    state.drive.missingScopes.map((scope) => (
                      <Badge key={scope} variant="outline">
                        {scope}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-slate-500">Keine</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/85 shadow-lg shadow-slate-900/5">
            <CardHeader>
              <CardTitle className="text-slate-950">Backup-Policy</CardTitle>
              <CardDescription>
                Dirty-State, 10-Tagesbericht-Schwelle und App-Start/App-Ende-Regeln.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-4">
                <span>Ungesicherte Aenderungen</span>
                <span>{state.backup.hasUnsavedChanges ? 'ja' : 'nein'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Tagesberichte seit letztem Backup</span>
                <span>{state.backup.dailyReportsSinceLastBackup}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Letztes erfolgreiches Backup</span>
                <span>{state.backup.lastSuccessfulBackupAt ?? 'noch keines'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Backup-Import offen</span>
                <span>{state.backup.pendingImport ? 'ja' : 'nein'}</span>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Ausstehende Gruende
                </p>
                <div className="flex flex-wrap gap-2">
                  {state.backup.pendingReasons.length ? (
                    state.backup.pendingReasons.map((reason) => (
                      <Badge key={reason} variant="outline">
                        {reason}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-slate-500">Keine</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/85 shadow-lg shadow-slate-900/5">
            <CardHeader>
              <CardTitle className="text-slate-950">Settings und Reports</CardTitle>
              <CardDescription>
                Import-Preview, Compare-Diff und Wochenbericht-Integritaet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-4">
                <span>Settings-Import offen</span>
                <span>{state.settings.pendingImport ? 'ja' : 'nein'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Unterschiede im Import</span>
                <span>{state.settings.pendingImportDifferenceCount}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Letzter Settings-Export</span>
                <span>{state.settings.lastExportedAt ?? 'noch keiner'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Gespeicherte Wochenbericht-Hashes</span>
                <span>{state.reports.weeklyHashCount}</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </DefaultLayout>
  );
}
