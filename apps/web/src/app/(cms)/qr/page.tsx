'use client';

import { useState } from 'react';
import Link from 'next/link';

import { PageShell } from '../../../components/page-shell';
import { documentId } from '../../../lib/api-client';
import { isLocalhostOrigin } from '../../../lib/customer-origin';
import { useTableQr } from '../../../lib/use-table-qr';

const PER_PAGE_OPTIONS = [
  { columns: 1, label: '1 per page' },
  { columns: 2, label: '4 per page' },
  { columns: 3, label: '9 per page' },
];

/**
 * Print sheet for table QR codes.
 *
 * Managing tables and codes lives on /tables — this page used to duplicate that
 * screen almost line for line. Its job now is the one thing /tables cannot do:
 * produce something you can physically put on a table.
 */
export default function QrPrintPage() {
  // Printers rasterise the on-screen image, so render well above display size.
  const qr = useTableQr({ width: 520 });
  const [columns, setColumns] = useState(2);
  const [showUrl, setShowUrl] = useState(false);

  const printable = qr.tables.filter((table) => table.qrToken);
  const localhost = isLocalhostOrigin(qr.customerOrigin);

  return (
    <PageShell
      description="Lay out every table's code on paper. Each sheet shows the outlet and table number so codes never end up on the wrong table."
      eyebrow="QR Codes"
      title="Print table QR codes"
      toolbar={
        <Link className="button-secondary" href="/tables">
          <span aria-hidden="true" className="material-symbols-outlined">arrow_back</span>
          Back to tables
        </Link>
      }
    >
      {qr.message ? <p className="notice-text">{qr.message}</p> : null}

      <section className="panel qr-print-controls">
        <div className="cms-section-head">
          <h2>Print setup</h2>
          <button
            disabled={printable.length === 0 || localhost}
            onClick={() => window.print()}
            title={localhost ? 'Open the CMS from your real domain first' : undefined}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">print</span>
            Print {printable.length} code{printable.length === 1 ? '' : 's'}
          </button>
        </div>

        {localhost ? (
          <p className="notice-text">
            <strong>These codes will not work.</strong> The CMS is open on <strong>localhost</strong>,
            so every code points back at this computer. Open the CMS from your real domain, then print.
          </p>
        ) : null}

        <div className="cms-form-grid cms-form-grid--two">
          <label>
            <span>Codes per page</span>
            <select onChange={(event) => setColumns(Number(event.target.value))} value={columns}>
              {PER_PAGE_OPTIONS.map((option) => (
                <option key={option.columns} value={option.columns}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Customer app origin</span>
            <input onChange={(event) => qr.setCustomerOrigin(event.target.value)} value={qr.customerOrigin} />
          </label>
        </div>
        <label className="checkbox-row">
          <input checked={showUrl} onChange={(event) => setShowUrl(event.target.checked)} type="checkbox" />
          Print the link under each code
        </label>
        <p className="muted">
          Codes are rendered at high resolution, so they stay sharp on paper. To change a table’s
          code, use Regenerate on the <Link href="/tables">tables screen</Link>.
        </p>
      </section>

      {printable.length === 0 && !qr.message ? (
        <section className="panel">
          <p className="muted">No tables have a QR code yet. Add tables first, then come back here to print.</p>
        </section>
      ) : null}

      <section className={`qr-sheet qr-sheet--${columns}`}>
        {printable.map((table) => {
          const tableId = documentId(table);

          return (
            <article className="qr-card" key={tableId}>
              <p className="qr-card__brand">{qr.tenant?.legalName ?? ''}</p>
              <p className="qr-card__outlet">{qr.branch?.name ?? ''}</p>
              <h2 className="qr-card__table">Table {table.tableNo}</h2>
              {qr.qrImages[tableId] ? (
                <img
                  alt={`Customer QR code for table ${table.tableNo}`}
                  className="qr-card__code"
                  src={qr.qrImages[tableId]}
                />
              ) : null}
              <p className="qr-card__cta">Scan to see the menu and order</p>
              {showUrl ? <p className="qr-card__url">{qr.customerUrl(table.qrToken)}</p> : null}
            </article>
          );
        })}
      </section>
    </PageShell>
  );
}
