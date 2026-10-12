import { useState } from 'react';
import { DashboardApplication } from './DashboardApplication';
import { createDemoData, demoUser } from './demo';
import { Card } from './primitives';
import { DemoDirectory } from './DemoDirectory';
export default function App() {
  const [period, setPeriod] = useState('This quarter');
  const [completed, setCompleted] = useState<string[]>([]);
  const [read, setRead] = useState(false);
  const fixtures = createDemoData(period);
  const data = {
    ...fixtures,
    tasks: fixtures.tasks.map((t) => ({
      ...t,
      completed: completed.includes(t.id),
    })),
    notifications: fixtures.notifications.map((n) => ({ ...n, read })),
  };
  return (
    <DashboardApplication
      idPrefix=""
      data={data}
      user={demoUser}
      period={period}
      periods={['This quarter', 'Last quarter']}
      onPeriodChange={setPeriod}
      navigationBadges={{ Leads: '24' }}
      demoControls
      onTaskToggle={(id, done) =>
        setCompleted((c) =>
          done ? [...c.filter((x) => x !== id), id] : c.filter((x) => x !== id),
        )
      }
      onMarkNotificationsRead={() => setRead(true)}
      renderPage={(page) => (
        <Card
          title={`${page} directory`}
          subtitle="Fictional demonstration records."
        >
          <DemoDirectory mode={page} />
        </Card>
      )}
    />
  );
}
