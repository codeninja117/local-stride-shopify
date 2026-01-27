// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  build: {
    outDir: 'assets',
    emptyOutDir: false,
    minify: 'terser',

    rollupOptions: {
      input: {
        'vendor-swiper': resolve(__dirname, 'src/vendor-swiper.js'),
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.includes('swiper')) {
            if (assetInfo.name.endsWith('.css')) {
              return 'vendor-swiper.css';
            }
          }
          return '[name][extname]';
        },
      },
    },

    terserOptions: {
      compress: {
        dead_code: true,
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log'],
        passes: 2,
      },
      mangle: {
        toplevel: true,
        properties: {
          keep_quoted: true,
          reserved: [
            // Core Swiper properties
            'Swiper',
            'use',
            'modules',
            'params',
            'loop',
            'loopCreate',
            'loopDestroy',
            'slides',
            'slideTo',
            'slideNext',
            'slidePrev',
            'destroy',
            'emit',
            'on',
            'once',
            'off',
            'init',

            // Module specific properties
            'navigation',
            'pagination',
            'scrollbar',
            'a11y',
            'autoplay',
            'thumbs',
            'effect',
            'creative',

            // Navigation
            'nextEl',
            'prevEl',
            'hideNext',
            'hidePrev',

            // Pagination
            'el',
            'type',
            'clickable',
            'dynamicBullets',

            // Common options
            'enabled',
            'direction',
            'touchEventsTarget',
            'initialSlide',
            'speed',
            'cssMode',
            'updateOnWindowResize',
            'resizeObserver',
            'nested',
            'focusableElements',
            'slidesPerView',
            'spaceBetween',
            'slidesPerGroup',
            'slidesPerGroupSkip',
            'centeredSlides',
            'centeredSlidesBounds',
            'watchOverflow',
            'roundLengths',
            'touchRatio',
            'touchAngle',
            'simulateTouch',
            'shortSwipes',
            'longSwipes',
            'longSwipesRatio',
            'longSwipesMs',
            'followFinger',
            'allowTouchMove',
            'threshold',
            'touchMoveStopPropagation',
            'touchStartPreventDefault',
            'touchStartForcePreventDefault',
            'touchReleaseOnEdges',
            'uniqueNavElements',
            'resistance',
            'resistanceRatio',
            'preventInteractionOnTransition',
            'allowSlidePrev',
            'allowSlideNext',
            'grabCursor',
            'preventClicks',
            'preventClicksPropagation',
            'slideToClickedSlide',
            'preloadImages',
            'updateOnImagesReady',
            'passiveListeners',
            'containerModifierClass',
            'slideClass',
            'slideBlankClass',
            'slideActiveClass',
            'slideDuplicateActiveClass',
            'slideVisibleClass',
            'slideDuplicateClass',
            'slideNextClass',
            'slideDuplicateNextClass',
            'slidePrevClass',
            'slideDuplicatePrevClass',
            'wrapperClass',
            'runCallbacksOnInit',
            'observer',
            'observeParents',
            'observeSlideChildren',

            // Events
            'beforeInit',
            'afterInit',
            'beforeDestroy',
            'destroy',
            'activeIndexChange',
            'realIndexChange',
            'init',
            'touchStart',
            'touchMove',
            'touchEnd',
            'click',
            'tap',
            'doubleTap',
            'sliderMove',
            'slideChange',
            'slideChangeTransitionStart',
            'slideChangeTransitionEnd',
            'slideChangeTransition',
            'slideNextTransitionStart',
            'slideNextTransitionEnd',
            'slidePrevTransitionStart',
            'slidePrevTransitionEnd',
            'transitionStart',
            'transitionEnd',
            'fromEdge',
            'reachEnd',
            'reachBeginning',
            'progress',
            'snapGridLengthChange',
            'snapIndexChange',
            'toEdge',
            'lock',
            'unlock',
            'swipe',
            'update',
          ],
        },
      },
      format: {
        comments: false,
      },
    },
  },

  optimizeDeps: {
    exclude: ['swiper'],
  },

  plugins: [
    // viteCompression({
    //   verbose: true,
    //   algorithm: 'gzip',
    //   ext: '.gz',
    //   threshold: 0,
    // }),
  ],
});
