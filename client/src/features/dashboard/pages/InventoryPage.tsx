import { PageHeader, ReadyToExplorePlaceholder, DonorsNearbyPanel, RED } from '../components/ui';

export default function InventoryPage() {
  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        pill="Blood inventory"
        title="Inventory overview"
        subtitle={<>Track stock levels across <span style={{ color: RED }}>all</span> blood groups.</>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        <ReadyToExplorePlaceholder featureName="Inventory overview" />
        <DonorsNearbyPanel />
      </div>
    </div>
  );
}
