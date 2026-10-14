import { Workspace } from './Workspace';
import type { ReactNode } from 'react';
import type { CrmOperations } from './api';
import type { Resource, User, RecordDto } from './contracts';
export function CrmContent({
  api,
  resource,
  user,
  organization,
  readOnly = false,
  renderRecordActions,
}: {
  api: CrmOperations;
  resource: Resource;
  user: User;
  organization: string;
  readOnly?: boolean;
  renderRecordActions?: (record: RecordDto) => ReactNode;
}) {
  return (
    <Workspace
      key={resource}
      api={api}
      controlledResource={resource}
      user={user}
      organization={organization}
      contentOnly
      readOnly={readOnly}
      renderRecordActions={renderRecordActions}
      onDisconnect={async () => {}}
      disconnectBusy={false}
      accessError=""
    />
  );
}
export type { CrmOperations } from './api';
