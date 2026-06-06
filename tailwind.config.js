/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', '"Fira Code"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        ibm: {
          bg:          '#161616',
          layer:       '#262626',
          'layer-hover':  '#333333',
          'layer-active': '#393939',
          'layer-accent': '#2a2a2a',
          border:      '#333333',
          'border-strong': '#525252',
          'border-subtle':  '#292929',
          text:        '#f4f4f4',
          'text-secondary': '#c6c6c6',
          'text-tertiary':  '#8d8d8d',
          'text-placeholder':'#6f6f6f',
          'text-disabled':  '#525252',
          blue:   '#78a9ff',
          teal:   '#3ddbd9',
          amber:  '#f1c21b',
          pink:   '#ff7eb6',
          purple: '#be95ff',
          green:  '#42be65',
          red:    '#fa4d56',
          cyan:   '#33b1ff',
        },
      },
    },
  },
  plugins: [],
};
