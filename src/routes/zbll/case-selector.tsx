import { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import collMap, { collGroups, ollAlgs } from '@/data/coll';
import zbllMap from '@/data/zbll';
import type { Alg } from '@/data/types';
import { AlgGroup } from './alg-group';
import { ZbllCase } from './zbll-case';

interface CaseSelectorProps {
  open: boolean;
  selectedCases: Record<string, boolean>;
  onClose(): void;
  onSubmit(cases: Record<string, boolean>): void;
}

export function CaseSelector({
  open,
  selectedCases,
  onClose,
  onSubmit,
}: CaseSelectorProps) {
  const [cases, setCases] = useState<Record<string, boolean>>(selectedCases);
  const [oll, setOll] = useState<string | null>(null);
  const [coll, setColl] = useState<string | null>(null);

  const selectedOllCollAlgs = useMemo(() => {
    if (!oll) return null;
    return collGroups[oll].map((c) => ({
      name: `${oll}/${c}`,
      alg: collMap[oll][c],
    }));
  }, [oll]);

  const selectedCollZbllAlgs = useMemo(() => {
    if (!oll || !coll) return null;
    const c = coll.split('/')[1];
    return Object.keys(zbllMap[oll][c]).map((zbll) => ({
      name: `${oll}/${c}/${zbll}`,
      alg: zbllMap[oll][c][zbll][0],
    }));
  }, [oll, coll]);

  const selectedCount = useMemo(() => {
    const count: Record<string, number> = {};
    Object.keys(cases).forEach((key) => {
      const parts = key.split('/');
      const ollKey = parts[0];
      const collKey = `${parts[0]}/${parts[1]}`;
      if (cases[key]) {
        count[ollKey] = (count[ollKey] ?? 0) + 1;
        count[collKey] = (count[collKey] ?? 0) + 1;
      }
    });
    return count;
  }, [cases]);

  const handleOllSelect = useCallback((alg: Alg) => {
    setColl(null);
    setOll(alg.name);
  }, []);

  const handleCollSelect = useCallback((alg: Alg) => {
    setColl(alg.name);
  }, []);

  const handleZbllSelect = useCallback((alg: Alg) => {
    setCases((prev) => ({ ...prev, [alg.name]: !prev[alg.name] }));
  }, []);

  // All/None operate on an OLL (parts.length === 1) or a COLL prefix.
  const bulkSet = useCallback((alg: Alg, value: boolean) => {
    const parts = alg.name.split('/');
    const ollKey = parts[0];
    setCases((prev) => {
      const next = { ...prev };
      const colls = parts.length === 1 ? collGroups[ollKey] : [parts[1]];
      colls.forEach((c) => {
        Object.keys(zbllMap[ollKey][c]).forEach((zbll) => {
          next[`${ollKey}/${c}/${zbll}`] = value;
        });
      });
      return next;
    });
  }, []);

  const handleAllClick = useCallback(
    (alg: Alg) => bulkSet(alg, true),
    [bulkSet],
  );
  const handleNoneClick = useCallback(
    (alg: Alg) => bulkSet(alg, false),
    [bulkSet],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="flex flex-row items-center gap-3 border-b px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogTitle className="flex-1">ZBLL Case Selector</DialogTitle>
          <Button onClick={() => onSubmit(cases)}>Done</Button>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] p-4">
          <div className="flex flex-wrap justify-center">
            {ollAlgs.map((alg) => (
              <AlgGroup
                key={alg.name}
                active={alg.name === oll}
                alg={alg}
                stage="oll"
                selectedCount={selectedCount}
                onSelect={handleOllSelect}
                onAllClick={handleAllClick}
                onNoneClick={handleNoneClick}
              />
            ))}
          </div>

          {selectedOllCollAlgs && (
            <div className="flex flex-wrap justify-center border-t pt-2">
              {selectedOllCollAlgs.map((alg) => (
                <AlgGroup
                  key={alg.name}
                  active={alg.name === coll}
                  alg={alg}
                  stage="coll"
                  selectedCount={selectedCount}
                  onSelect={handleCollSelect}
                  onAllClick={handleAllClick}
                  onNoneClick={handleNoneClick}
                />
              ))}
            </div>
          )}

          {selectedCollZbllAlgs && (
            <div className="flex flex-wrap justify-center gap-1 border-t pt-2">
              {selectedCollZbllAlgs.map((alg) => (
                <ZbllCase
                  key={alg.name}
                  alg={alg}
                  selected={!!cases[alg.name]}
                  onSelect={handleZbllSelect}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
