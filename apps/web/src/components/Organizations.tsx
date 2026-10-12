import { useApplication } from '../providers/context';
export function Organizations() {
  const { tenant, organizations, selectOrganization, reloadOrganizations } =
    useApplication();
  return (
    <section className="foundation-status">
      <h1>Organization access</h1>
      <p role="status">
        {tenant.status === 'ready' ? tenant.organization.name : tenant.message}
      </p>
      {organizations.length > 0 && (
        <label>
          Organization
          <select
            aria-label="Organization"
            value={tenant.status === 'ready' ? tenant.organization.id : ''}
            onChange={(event) => {
              if (event.target.value)
                void selectOrganization(event.target.value);
            }}
          >
            <option value="">Choose an organization</option>
            {organizations.map((item) => (
              <option key={item.organizationId} value={item.organizationId}>
                {item.organizationName} · {item.role}
              </option>
            ))}
          </select>
        </label>
      )}
      <button onClick={reloadOrganizations}>Refresh organization access</button>
    </section>
  );
}
