import {
  ACTION_LABELS,
  LOCKED_PERMISSIONS,
  permissionKey,
  SCREENS,
  SCREEN_ACTIONS,
  type ScreenAction,
  type ScreenDefinition,
  type ScreenGroup,
} from '@restaurent/shared';

/**
 * Pure helpers behind the role-builder grid. Kept free of React so the
 * implication rules can be reasoned about (and tested) on their own.
 */

export const screensInGroup = (group: ScreenGroup): ScreenDefinition[] =>
  SCREENS.filter((screen) => screen.group === group && !screen.platformOnly);

const allKeysFor = (screen: ScreenDefinition): string[] => [
  ...screen.actions.map((action) => permissionKey(screen.key, action)),
  ...(screen.advanced ?? []).map((advanced) => permissionKey(screen.key, advanced.key)),
];

/** Locked screens must always stay viewable, or a role has nowhere to land. */
export const normalize = (granted: Iterable<string>): Set<string> => {
  const next = new Set(granted);

  for (const permission of LOCKED_PERMISSIONS) {
    next.add(permission);
  }

  return next;
};

/**
 * Two implication rules, deliberately no more — cross-screen cleverness makes
 * these grids feel haunted:
 *  - granting any action implies being able to view the screen;
 *  - removing view removes everything else on that screen.
 */
export const applyToggle = (
  granted: ReadonlySet<string>,
  screen: ScreenDefinition,
  action: string,
  enabled: boolean,
): Set<string> => {
  const next = new Set(granted);
  const key = permissionKey(screen.key, action);

  if (enabled) {
    next.add(key);
    next.add(permissionKey(screen.key, 'view'));
  } else {
    next.delete(key);

    if (action === 'view') {
      for (const other of allKeysFor(screen)) {
        next.delete(other);
      }
    }
  }

  return normalize(next);
};

export const toggleRow = (
  granted: ReadonlySet<string>,
  screen: ScreenDefinition,
  enabled: boolean,
): Set<string> => {
  const next = new Set(granted);

  for (const key of allKeysFor(screen)) {
    if (enabled) {
      next.add(key);
    } else {
      next.delete(key);
    }
  }

  return normalize(next);
};

export const toggleColumn = (
  granted: ReadonlySet<string>,
  group: ScreenGroup,
  action: ScreenAction,
  enabled: boolean,
): Set<string> => {
  let next = new Set(granted);

  for (const screen of screensInGroup(group)) {
    if (screen.actions.includes(action)) {
      next = applyToggle(next, screen, action, enabled);
    }
  }

  return next;
};

export const rowState = (
  granted: ReadonlySet<string>,
  screen: ScreenDefinition,
): { all: boolean; partial: boolean } => {
  const keys = allKeysFor(screen);
  const held = keys.filter((key) => granted.has(key)).length;

  return { all: held === keys.length && held > 0, partial: held > 0 && held < keys.length };
};

export const countAdvanced = (granted: ReadonlySet<string>, screen: ScreenDefinition): number =>
  (screen.advanced ?? []).filter((advanced) => granted.has(permissionKey(screen.key, advanced.key))).length;

export interface PermissionSummary {
  canCreate: string[];
  canDelete: string[];
  canEdit: string[];
  canSee: string[];
  hidden: string[];
}

/** Says back, in plain words, what the person just built. */
export const summarize = (granted: ReadonlySet<string>): PermissionSummary => {
  const tenantScreens = SCREENS.filter((screen) => !screen.platformOnly);
  const labelsWhere = (action: ScreenAction): string[] =>
    tenantScreens
      .filter((screen) => screen.actions.includes(action) && granted.has(permissionKey(screen.key, action)))
      .map((screen) => screen.label);

  return {
    canCreate: labelsWhere('add'),
    canDelete: labelsWhere('delete'),
    canEdit: labelsWhere('edit'),
    canSee: labelsWhere('view'),
    hidden: tenantScreens
      .filter((screen) => !granted.has(permissionKey(screen.key, 'view')))
      .map((screen) => screen.label),
  };
};

export { ACTION_LABELS, SCREEN_ACTIONS };
