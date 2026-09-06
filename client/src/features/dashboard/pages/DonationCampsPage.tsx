import { PageHeader, ReadyToExplorePlaceholder, DonorsNearbyPanel, RED } from '../components/ui';

export default function DonationCampsPage() {
  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        pill="Donation camps"
        title="Community donation camps"
        subtitle={<>Plan <span style={{ color: RED }}>upcoming</span> drives and welcome new donors.</>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        <ReadyToExplorePlaceholder featureName="Community donation camps" />
        <DonorsNearbyPanel />
      </div>
    </div>
  );
}
