export interface ApiCard {
  eyebrow: string;
  title: string;
  value: string;
}

export const cmsKpis: ApiCard[] = [
  { eyebrow: 'Live orders', title: 'Kitchen queue', value: '14' },
  { eyebrow: 'Active tables', title: 'Floor load', value: '9' },
  { eyebrow: 'Service requests', title: 'Pending buzzers', value: '3' },
  { eyebrow: 'Revenue today', title: 'Gross sales', value: 'Rs 18,240' },
];

export const customerHighlights = [
  'Share one bucket with friends at the same table.',
  'Switch branches between self-service and waiter confirmation.',
  'Track service requests without leaving the menu flow.',
];

