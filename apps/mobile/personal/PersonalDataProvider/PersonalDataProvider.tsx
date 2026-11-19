import { useCallback, useEffect, useMemo, useState } from 'react';

import { personalDataSource } from '../../storage';
import type { PersonalRepository } from '../../storage/personal/types';
import { PersonalDataContext } from './PersonalDataContext';
import type { PersonalData, PersonalDataProviderProps } from './types';

type Loaded = {
  repository: PersonalRepository;
  loadFailed: boolean;
  recoveredFromUnreadable: boolean;
};

// Nothing here logs. A failed load is not reported with anything from the database. It counts as
// an empty store, so the app is never blocked, and the screens are told through `loadFailed`.
export function PersonalDataProvider({
  children,
  source = personalDataSource,
}: PersonalDataProviderProps) {
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);
  // What the screens see while loading. It is made once per source, so they see one store.
  const placeholder = useMemo(() => source.createEmpty(), [source]);

  useEffect(() => {
    let isCurrent = true;
    // The recovery notice is taken only for a result that is used, so a load that is discarded
    // does not use up the notice.
    source.load().then(
      (repository) => {
        if (isCurrent) {
          setLoaded({
            repository,
            loadFailed: false,
            recoveredFromUnreadable: repository.takeRecoveryNotice(),
          });
        }
      },
      () => {
        if (isCurrent) {
          setLoaded({
            repository: source.createEmpty(),
            loadFailed: true,
            recoveredFromUnreadable: false,
          });
        }
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [source]);

  const dismissRecoveryNotice = useCallback(() => {
    setLoaded((current) => current && { ...current, recoveredFromUnreadable: false });
  }, []);

  const personalData = useMemo<PersonalData>(
    () => ({
      isLoading: loaded === undefined,
      loadFailed: loaded?.loadFailed ?? false,
      repository: loaded?.repository ?? placeholder,
      recoveredFromUnreadable: loaded?.recoveredFromUnreadable ?? false,
      dismissRecoveryNotice,
    }),
    [loaded, placeholder, dismissRecoveryNotice],
  );

  return (
    <PersonalDataContext.Provider value={personalData}>{children}</PersonalDataContext.Provider>
  );
}
