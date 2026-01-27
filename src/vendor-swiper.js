// vendor-swiper.js
import Swiper from 'swiper';
import { Navigation, Pagination, Scrollbar, A11y, Autoplay, Thumbs, EffectCreative } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// Register Swiper modules
Swiper.use([Navigation, Pagination, Scrollbar, A11y, Autoplay, Thumbs, EffectCreative]);

// Make Swiper available globally
window.Swiper = Swiper;

// Dispatch event when Swiper is loaded
window.dispatchEvent(new Event('swiperLoaded'));
