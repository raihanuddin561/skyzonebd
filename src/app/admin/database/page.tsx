'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import { exportToCsv } from '@/utils/csvExport';
import { parseCsv } from '@/utils/csvImport';

const RESET_CONFIRMATION_PHRASE = 'DELETE ALL DATA';

type MigrationStatusValue = 'up_to_date' | 'pending' | 'unknown' | 'loading';

interface MigrationStatusState {
  status: MigrationStatusValue;
  pendingMigrations: string[];
}

interface ImportRowResult {
  index: number;
  success: boolean;
  error?: string;
}

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function DatabaseManagementPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // ── Migration status/apply ──────────────────────────────────────────
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatusState>({
    status: 'loading',
    pendingMigrations: [],
  });
  const [runningMigration, setRunningMigration] = useState(false);
  const [showMigrateConfirm, setShowMigrateConfirm] = useState(false);

  const fetchMigrationStatus = useCallback(async () => {
    setMigrationStatus((s) => ({ ...s, status: 'loading' }));
    try {
      const res = await fetch('/api/admin/database/migration-status', { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setMigrationStatus({ status: data.status, pendingMigrations: data.pendingMigrations || [] });
      } else {
        setMigrationStatus({ status: 'unknown', pendingMigrations: [] });
      }
    } catch {
      setMigrationStatus({ status: 'unknown', pendingMigrations: [] });
    }
  }, []);

  useEffect(() => {
    fetchMigrationStatus();
  }, [fetchMigrationStatus]);

  const handleRunMigration = async () => {
    setShowMigrateConfirm(false);
    setRunningMigration(true);
    try {
      const res = await fetch('/api/admin/database/migrate', {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) toast.success(data.message);
      else toast.error(data.error || 'Migration failed');
      await fetchMigrationStatus();
    } catch {
      toast.error('Failed to run migration');
    } finally {
      setRunningMigration(false);
    }
  };

  // ── Danger zone: full reset ─────────────────────────────────────────
  const [resetMode, setResetMode] = useState<'keep' | 'reset'>('keep');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [reseed, setReseed] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [runningReset, setRunningReset] = useState(false);

  const canExecuteReset = confirmationInput === RESET_CONFIRMATION_PHRASE;

  const handleFullReset = async () => {
    setShowResetConfirm(false);
    setRunningReset(true);
    try {
      const res = await fetch('/api/admin/database/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ confirmationText: confirmationInput, reseed }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message, { autoClose: 10000 });
        setConfirmationInput('');
        setResetMode('keep');
        await fetchMigrationStatus();
      } else {
        toast.error(data.error || 'Reset failed');
      }
    } catch {
      toast.error('Failed to reset database');
    } finally {
      setRunningReset(false);
    }
  };

  // ── Export / Import ──────────────────────────────────────────────────
  const [entity, setEntity] = useState<'products' | 'categories'>('products');
  const [exporting, setExporting] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, unknown>[] | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importMode, setImportMode] = useState<'insert' | 'upsert'>('upsert');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ succeeded: number; failed: number; results: ImportRowResult[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchExportData = async () => {
    const res = await fetch(`/api/admin/database/export?entity=${entity}`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Export failed');
    return data.rows as Record<string, unknown>[];
  };

  const handleExportJson = async () => {
    setExporting(true);
    try {
      const rows = await fetchExportData();
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${entity}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} ${entity} record(s) as JSON`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchExportData();
      exportToCsv(entity, rows);
      toast.success(`Exported ${rows.length} ${entity} record(s) as CSV`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResults(null);
    setImportFileName(file.name);
    const text = await file.text();
    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        setImportRows(parseCsv(text));
      } else {
        const parsed = JSON.parse(text);
        setImportRows(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      toast.error('Could not parse file — expected valid JSON array or CSV');
      setImportRows(null);
    }
  };

  const handleImport = async () => {
    if (!importRows || importRows.length === 0) return;
    setImporting(true);
    setImportResults(null);
    try {
      const res = await fetch('/api/admin/database/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ entity, rows: importRows, mode: importMode }),
      });
      const data = await res.json();
      if (data.success) {
        setImportResults(data.summary && data.results ? { ...data.summary, results: data.results } : null);
        toast.success(`Import complete: ${data.summary.succeeded} succeeded, ${data.summary.failed} failed`);
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch {
      toast.error('Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Database Management</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Schema migrations, full reset, and bulk data export/import.
        </p>
      </div>

      {/* Migration status + apply */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Schema Migrations</h3>
            <p className="text-sm text-gray-500 mt-1">
              Applies any migrations committed to the codebase that haven&apos;t reached this database yet. Existing data is never touched.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchMigrationStatus}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 border border-blue-200 rounded"
          >
            &#8635; Refresh
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 text-sm">Prisma migrations</span>
                {migrationStatus.status === 'loading' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Checking...</span>
                )}
                {migrationStatus.status === 'up_to_date' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">&#10003; Up to date</span>
                )}
                {migrationStatus.status === 'pending' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">&#9888; Pending</span>
                )}
                {migrationStatus.status === 'unknown' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">? Could not determine</span>
                )}
              </div>
              {migrationStatus.status === 'pending' && migrationStatus.pendingMigrations.length > 0 && (
                <ul className="text-xs text-amber-700 font-mono list-disc list-inside">
                  {migrationStatus.pendingMigrations.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
              {migrationStatus.status === 'unknown' && (
                <p className="text-xs text-red-600">
                  Status could not be confirmed — the button stays disabled until this resolves. Check server logs.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowMigrateConfirm(true)}
              disabled={runningMigration || migrationStatus.status !== 'pending'}
              className={
                migrationStatus.status === 'pending'
                  ? 'shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            >
              {runningMigration ? 'Running...' : 'Run Migration'}
            </button>
          </div>
        </div>
      </div>

      {/* Danger zone: full reset — super admin only */}
      {isSuperAdmin && (
        <div className="bg-white rounded-lg shadow-sm border-2 border-red-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-red-700 mb-1">Danger Zone — Full Reset</h3>
          <p className="text-sm text-gray-500 mb-4">
            Drops the entire database and recreates it from the full migration history. This destroys every order,
            user, and financial record. Only visible to Super Admins.
          </p>

          <div className="space-y-3 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={resetMode === 'keep'} onChange={() => setResetMode('keep')} />
              <span className="text-sm text-gray-800">Keep existing data (use &quot;Run Migration&quot; above)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={resetMode === 'reset'} onChange={() => setResetMode('reset')} />
              <span className="text-sm font-medium text-red-700">Full reset — delete ALL data</span>
            </label>
          </div>

          {resetMode === 'reset' && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Type <code className="bg-white px-1.5 py-0.5 rounded border border-red-200">{RESET_CONFIRMATION_PHRASE}</code> to confirm
                </label>
                <input
                  type="text"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder={RESET_CONFIRMATION_PHRASE}
                  className="w-full px-4 py-2 border border-red-300 rounded-lg font-mono"
                />
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={reseed} onChange={(e) => setReseed(e.target.checked)} className="mt-1" />
                <span className="text-sm text-gray-700">
                  Reseed with sample data after reset.{' '}
                  <span className="text-amber-700 font-medium">
                    Warning: the seed script creates a default admin account with a publicly known password — change it immediately if you enable this.
                  </span>
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                disabled={!canExecuteReset || runningReset}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {runningReset ? 'Resetting...' : 'Execute Full Reset'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Export / Import */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Export / Import Data</h3>
        <p className="text-sm text-gray-500 mb-4">Bulk export or import Products and Categories.</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Entity</label>
          <select
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value as 'products' | 'categories');
              setImportRows(null);
              setImportResults(null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="products">Products</option>
            <option value="categories">Categories</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={handleExportJson}
            disabled={exporting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export as JSON'}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export as CSV'}
          </button>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Import file (.json or .csv)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            onChange={handleFileSelected}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium"
          />

          {importRows && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{importFileName}</span> — {importRows.length} row(s) parsed.
              </p>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(importRows[0] || {}).slice(0, 6).map((key) => (
                        <th key={key} className="px-3 py-2 text-left font-medium text-gray-600">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        {Object.keys(importRows[0] || {}).slice(0, 6).map((key) => (
                          <td key={key} className="px-3 py-2 text-gray-700 truncate max-w-[160px]">{String(row[key] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importRows.length > 3 && (
                <p className="text-xs text-gray-500">Showing first 3 of {importRows.length} rows.</p>
              )}

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" checked={importMode === 'insert'} onChange={() => setImportMode('insert')} />
                  Insert only (fails on duplicate slug)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" checked={importMode === 'upsert'} onChange={() => setImportMode('upsert')} />
                  Upsert (update if slug exists)
                </label>
              </div>

              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Import ${importRows.length} row(s)`}
              </button>
            </div>
          )}

          {importResults && (
            <div className="mt-4 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">
                {importResults.succeeded} succeeded, {importResults.failed} failed
              </p>
              {importResults.failed > 0 && (
                <ul className="text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto">
                  {importResults.results.filter((r) => !r.success).map((r) => (
                    <li key={r.index}>Row {r.index + 1}: {r.error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showMigrateConfirm}
        onClose={() => setShowMigrateConfirm(false)}
        onConfirm={handleRunMigration}
        title="Apply pending migrations?"
        message={`This applies ${migrationStatus.pendingMigrations.length} pending migration(s) to the live database. Existing data is preserved.`}
        confirmText="Apply Migrations"
        type="warning"
        isLoading={runningMigration}
      />

      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleFullReset}
        title="Permanently delete ALL data?"
        message="This cannot be undone. Every order, user, product, and financial record will be destroyed and the schema recreated from scratch."
        confirmText="Yes, Delete Everything"
        type="danger"
        isLoading={runningReset}
      />
    </div>
  );
}
