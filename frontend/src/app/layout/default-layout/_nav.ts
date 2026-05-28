import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    linkProps: {
      routerLinkActiveOptions: { exact: true },
    },
  },
  {
    name: 'RBAP Plans',
    url: '/plans',
    linkProps: {
      routerLinkActiveOptions: { exact: true },
    },
  },
];
