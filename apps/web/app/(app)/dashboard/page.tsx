import { KPICards } from './components/kpi-cards';
import { StickyNotesSection } from './components/sticky-notes-section';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 pb-6">
      <KPICards />
      <div className="px-4 lg:px-6">
        <StickyNotesSection />
      </div>
    </div>
  );
}
