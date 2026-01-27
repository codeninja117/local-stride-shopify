/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      typography: () => ({
        DEFAULT: {
          css: {
            lineHeight: '1.5',
            color: '#364153',
            '> *:first-child': {
              marginTop: '0',
            },
            h2: {
              marginTop: '1em',
              marginBottom: '.3333em',
            },
            'h2 + *': {
              marginTop: '0',
            },
            h3: {
              marginTop: '0.8em',
              marginBottom: '0.4em',
              lineHeight: '1.25',
            },
            h4: {
              marginTop: '1em',
              marginBottom: '0.5em',
            },
            'ul > li:first-child': {
              marginTop: '0',
            },
            li: {
              marginBottom: '.5em ',
            },
            'li > *': {
              marginTop: '0 ',
              marginBottom: '0 ',
            },
            video: {
              marginTop: '1em ',
              marginBottom: '1.25em ',
            },
            figure: {
              marginTop: '1em ',
              marginBottom: '1.25em ',
            },
            'figure > img': {
              marginTop: '1em ',
              marginBottom: '0.5em ',
            },
            p: {
              marginTop: '0.5em ',
              marginBottom: '0.5em ',
            },
            img: {
              marginTop: '1em ',
              marginBottom: '1.25em ',
            },
          },
        },
      }),
    },
  },
};
