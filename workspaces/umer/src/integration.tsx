import { Workspace } from './Workspace';
import type { CrmOperations } from './api';
import type { Resource, User } from './contracts';
export function CrmContent({
  api,
  resource,
  user,
  organization,
  readOnly = false,
}: {
  api: CrmOperations;
  resource: Resource;
  user: User;
  organization: string;
  readOnly?: boolean;
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
      onDisconnect={async () => {}}
      disconnectBusy={false}
      accessError=""
    />
  );
}
export type { CrmOperations } from './api';
