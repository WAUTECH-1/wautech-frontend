import { useEffect, useState } from 'react';
import { useFeatureApplication } from '../contract';
import { RequestLease } from '../../integrations/lifecycle';
import { createOperationsApi } from './api';
export function useOperations() {
  const app = useFeatureApplication();
  const [api] = useState(() => createOperationsApi(app));
  const [lease] = useState(() => new RequestLease());
  useEffect(() => {
    const g = lease.enter();
    return () => lease.leave(g, api.dispose);
  }, [api, lease]);
  return api;
}
