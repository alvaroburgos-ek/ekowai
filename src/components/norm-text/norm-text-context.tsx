'use client';

/**
 * Context that lets any clauseReference badge anywhere in the worksheet view
 * open the split-view norm-text reader without prop-drilling.
 *
 * Render the `<NormTextProvider>` once per worksheet page (passing the
 * worksheet's `standardCode`), then call `useOpenNormText()` from any leaf
 * component to open the panel for a given `clauseReference`.
 *
 * The provider also renders the `<NormTextPane>` itself, so consumers don't
 * need to mount it separately.
 */

import { createContext, useCallback, useContext, useState } from 'react';
import { NormTextPane } from './norm-text-pane';

type OpenFn = (clauseReference: string) => void;

const Ctx = createContext<OpenFn | null>(null);

export function NormTextProvider({
  standardCode,
  children,
}: {
  /** Standard code as stored in `standards.code` (e.g. `DWA-A-138-1`). */
  standardCode: string;
  children: React.ReactNode;
}) {
  const [clause, setClause] = useState<string | null>(null);

  const open = useCallback<OpenFn>((clauseReference) => {
    setClause(clauseReference);
  }, []);

  const close = useCallback(() => setClause(null), []);

  return (
    <Ctx.Provider value={open}>
      {children}
      <NormTextPane
        standardCode={standardCode}
        clauseReference={clause}
        open={clause !== null}
        onClose={close}
      />
    </Ctx.Provider>
  );
}

/**
 * Returns a function that opens the norm-text panel at the given clauseRef.
 *
 * Returns `null` when called outside a provider — callers should fall back to
 * rendering the clause as plain text in that case (covered by `<ClauseChip>`).
 */
export function useOpenNormText(): OpenFn | null {
  return useContext(Ctx);
}
