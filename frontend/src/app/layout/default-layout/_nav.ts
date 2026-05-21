import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    linkProps: {
      routerLinkActiveOptions: { exact: true },
    },
  },
];
