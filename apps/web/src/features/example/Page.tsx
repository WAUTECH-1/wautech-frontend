import { useFeatureApplication } from '../contract';
export default function ExamplePage() {
  const { tenant } = useFeatureApplication();
  return (
    <section>
      <h1>Feature contract example</h1>
      <p>
        {tenant.status === 'ready'
          ? tenant.organization.name
          : 'Choose an organization.'}
      </p>
    </section>
  );
}
