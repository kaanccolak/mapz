import { SharePlanClient } from './SharePlanClient';

export default function SharedPlanPage({ params }: { params: { shareId: string } }) {
  return <SharePlanClient shareId={params.shareId} />;
}
