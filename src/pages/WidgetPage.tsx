import React from 'react';
import { PlannerWidget } from '@/components/widget/PlannerWidget';

export function WidgetPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <PlannerWidget />
    </div>
  );
}
