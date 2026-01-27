if (!customElements.get('product-modal')) {
  customElements.define(
    'product-modal',
    class ProductModal extends ModalDialog {
      constructor() {
        super();
      }

      hide() {
        super.hide();

        // Pause any playing videos when closing the modal
        const activeVideos = this.querySelectorAll('video');
        activeVideos.forEach((video) => {
          if (!video.paused) video.pause();
        });
      }

      show(opener) {
        super.show(opener);
        this.showActiveMedia();
      }

      // showActiveMedia() {
      //   this.querySelectorAll(
      //     `[data-media-id]:not([data-media-id="${this.openedBy.getAttribute('data-media-id')}"])`,
      //   ).forEach((element) => {
      //     element.classList.remove('active');
      //   });
      //   const activeMedia = this.querySelector(`[data-media-id="${this.openedBy.getAttribute('data-media-id')}"]`);
      //   const activeMediaTemplate = activeMedia.querySelector('template');
      //   const activeMediaContent = activeMediaTemplate ? activeMediaTemplate.content : null;
      //   activeMedia.classList.add('active');
      //   activeMedia.scrollIntoView();

      //   const container = this.querySelector('[role="document"]');
      //   container.scrollLeft = (activeMedia.width - container.clientWidth) / 2;

      //   if (
      //     activeMedia.nodeName == 'DEFERRED-MEDIA' &&
      //     activeMediaContent &&
      //     activeMediaContent.querySelector('.js-youtube')
      //   )
      //     activeMedia.loadContent();
      // }

      showActiveMedia() {
        // Hide all media items first
        this.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('active');
        });

        // Get the media ID from the opener
        const mediaId = this.openedBy.getAttribute('data-media-id');

        // Find and activate the corresponding media in the modal
        const activeMedia = this.querySelector(`[data-media-id="${mediaId}"]`);

        if (activeMedia) {
          activeMedia.classList.add('active');

          // Handle deferred media if present
          const deferredMedia = activeMedia.querySelector('deferred-media');
          if (deferredMedia && !deferredMedia.getAttribute('loaded')) {
            deferredMedia.loadContent();
          }

          // Scroll into view
          activeMedia.scrollIntoView();

          // Adjust scrolling position
          const container = this.querySelector('[role="document"]');
          if (container && activeMedia.offsetWidth) {
            container.scrollLeft = (activeMedia.offsetWidth - container.clientWidth) / 2;
          }
        }
      }
    },
  );
}
