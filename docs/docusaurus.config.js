// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'TaskDesk',
  tagline: 'Task management with session replay',
  favicon: 'img/favicon.ico',

  url: 'https://taskdesk.dev',
  baseUrl: '/',

  organizationName: 'taskdesk',
  projectName: 'taskdesk',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  plugins: [
    function disableIncompatibleProgressPlugin() {
      return {
        name: 'disable-incompatible-progress-plugin',
        configureWebpack(webpackConfig) {
          // Work around webpack 5.106+ schema validation rejecting
          // webpackbar-style options (name/color/reporters/reporter).
          // We patch both start and build flows.
          webpackConfig.plugins = (webpackConfig.plugins || []).filter((plugin) => {
            const pluginName = plugin?.constructor?.name;
            const pluginOptions = plugin?.options;

            if (
              (pluginName === 'WebpackBarPlugin' || pluginName === 'ProgressPlugin') &&
              pluginOptions &&
              (Object.hasOwn(pluginOptions, 'name') ||
                Object.hasOwn(pluginOptions, 'color') ||
                Object.hasOwn(pluginOptions, 'reporters') ||
                Object.hasOwn(pluginOptions, 'reporter'))
            ) {
              return false;
            }

            return true;
          });

          // Mutate in place to avoid altering plugin merge behavior.
          return undefined;
        },
      };
    },
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'light',
      },
      navbar: {
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Docs',
          },
          {
            href: 'https://github.com/sthasuyash/taskdesk',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;