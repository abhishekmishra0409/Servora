"use client";

import { useState } from 'react';
import { permissionKey, SCREEN_GROUPS, type ScreenAction } from '@restaurent/shared';

import {
  ACTION_LABELS,
  SCREEN_ACTIONS,
  applyToggle,
  countAdvanced,
  rowState,
  screensInGroup,
  toggleColumn,
  toggleRow,
} from '../lib/permission-matrix';

interface PermissionMatrixProps {
  granted: ReadonlySet<string>;
  /** Permissions that cannot be switched off (e.g. editing your own role). */
  locked?: ReadonlySet<string>;
  onChange?: (next: Set<string>) => void;
  readOnly?: boolean;
}

/**
 * The screen-by-action grid.
 *
 * On desktop the four action cells are grid children of the row (via
 * `display: contents`); below 760px the same DOM reflows into labelled chips,
 * because a bare checkbox in a nameless column is unusable on a phone.
 */
export function PermissionMatrix({
  granted,
  locked,
  onChange,
  readOnly = false,
}: PermissionMatrixProps): React.ReactElement {
  const [openAdvanced, setOpenAdvanced] = useState('');
  const isLocked = (key: string): boolean => Boolean(locked?.has(key));

  return (
    <div className="perm-matrix">
      {SCREEN_GROUPS.map((group) => {
        const screens = screensInGroup(group.key);

        if (screens.length === 0) {
          return null;
        }

        return (
          <section key={group.key}>
            <div className="perm-matrix__group-head">
              <h3>{group.label}</h3>
              {readOnly ? null : (
                <div className="perm-matrix__group-actions">
                  {SCREEN_ACTIONS.map((action) => (
                    <button
                      className="button-quiet"
                      key={action}
                      onClick={() => onChange?.(toggleColumn(granted, group.key, action, true))}
                      type="button"
                    >
                      All {ACTION_LABELS[action]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div aria-hidden="true" className="perm-matrix__head">
              <span>Screen</span>
              {SCREEN_ACTIONS.map((action) => (
                <span key={action}>{ACTION_LABELS[action]}</span>
              ))}
            </div>

            {screens.map((screen) => {
              const row = rowState(granted, screen);
              const advancedCount = countAdvanced(granted, screen);

              return (
                <div className="perm-row" key={screen.key}>
                  <div className="perm-row__screen">
                    <label className="checkbox-row">
                      <input
                        checked={row.all}
                        disabled={readOnly || screen.locked}
                        onChange={(event) => onChange?.(toggleRow(granted, screen, event.target.checked))}
                        ref={(node) => {
                          if (node) {
                            node.indeterminate = row.partial;
                          }
                        }}
                        type="checkbox"
                      />
                      <span>{screen.label}</span>
                    </label>
                    <small className="muted">{screen.locked ? 'Always visible' : screen.href}</small>
                  </div>

                  <div className="perm-row__actions">
                    {SCREEN_ACTIONS.map((action: ScreenAction) => {
                      if (!screen.actions.includes(action)) {
                        return (
                          <span aria-hidden="true" className="perm-cell perm-cell--na" key={action}>
                            &mdash;
                          </span>
                        );
                      }

                      const key = permissionKey(screen.key, action);

                      return (
                        <label className="perm-cell" key={action}>
                          <input
                            aria-label={`${screen.label}: ${ACTION_LABELS[action]}`}
                            checked={granted.has(key)}
                            disabled={
                              readOnly || isLocked(key) || (screen.locked && action === 'view')
                            }
                            onChange={(event) =>
                              onChange?.(applyToggle(granted, screen, action, event.target.checked))
                            }
                            type="checkbox"
                          />
                          <span className="perm-cell__label">{ACTION_LABELS[action]}</span>
                        </label>
                      );
                    })}
                  </div>

                  {screen.advanced?.length ? (
                    <div className="perm-row__advanced">
                      <button
                        className="button-quiet"
                        onClick={() => setOpenAdvanced(openAdvanced === screen.key ? '' : screen.key)}
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">
                          {openAdvanced === screen.key ? 'expand_less' : 'expand_more'}
                        </span>
                        Advanced ({advancedCount}/{screen.advanced.length})
                      </button>
                      {openAdvanced === screen.key ? (
                        <div className="cms-permission-grid perm-advanced">
                          {screen.advanced.map((advanced) => {
                            const key = permissionKey(screen.key, advanced.key);

                            return (
                              <label className="checkbox-row" key={advanced.key}>
                                <input
                                  checked={granted.has(key)}
                                  disabled={readOnly || isLocked(key)}
                                  onChange={(event) =>
                                    onChange?.(
                                      applyToggle(granted, screen, advanced.key, event.target.checked),
                                    )
                                  }
                                  type="checkbox"
                                />
                                {advanced.label}
                              </label>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
