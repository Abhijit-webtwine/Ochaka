// swiper product details
if ($(".product-thumbs-slider").length > 0) {
    var direction = $(".tf-product-media-thumbs").data("direction");
    var preview = $(".tf-product-media-thumbs").data("preview");
    var space = $(".tf-product-media-thumbs").data("space") || 8;

    var thumbs = new Swiper(".tf-product-media-thumbs", {
        spaceBetween: space,
        slidesPerView: preview,
        freeMode: false,
        // direction: "vertical",
        watchSlidesProgress: false,
        observer: false,
        autoHeight: true,
        observeParents: false,
        navigation: {
            nextEl: ".nav-next-thumbs",
            prevEl: ".nav-prev-thumbs",
        },

        breakpoints: {
            0: {
                direction: "horizontal",
                slidesPerView: 5,
            },
            1200: {
                direction: direction,
                slidesPerView: preview,
            },
        },
    });

    var main = new Swiper(".tf-product-media-main", {
        spaceBetween: 0,
        observer: true,
        observeParents: true,
        noSwiping: true,
        noSwipingClass: "swiper-no-swiping",
        navigation: {
            nextEl: ".thumbs-next",
            prevEl: ".thumbs-prev",
        },
        thumbs: {
            swiper: thumbs,
        },
    });

    function pauseGalleryMedia(swiper) {
        if (!swiper || !swiper.el) return;
        swiper.el.querySelectorAll("video").forEach((v) => v.pause());
        swiper.el.querySelectorAll(".js-youtube").forEach((yt) => {
            if (yt.contentWindow) yt.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        });
        swiper.el.querySelectorAll(".js-vimeo").forEach((vm) => {
            if (vm.contentWindow) vm.contentWindow.postMessage('{"method":"pause"}', '*');
        });
        swiper.el.querySelectorAll("product-model").forEach((model) => {
            if (model.modelViewerUI) model.modelViewerUI.pause();
        });
    }

    function playActiveSlideVideo(swiper) {
        if (!swiper || !swiper.slides) return;
        var activeIndex = swiper.activeIndex;
        var activeSlide = swiper.slides[activeIndex] || $(".tf-product-media-main .swiper-slide").eq(activeIndex)[0];
        if (!activeSlide) return;

        // Skip queries if slide is an image
        var mediaType = activeSlide.getAttribute("data-media-type");
        if (mediaType === "image") return;

        // 1. HTML5 Video
        var video = activeSlide.querySelector("video");
        if (video) {
            video.muted = true;
            video.playsInline = true;
            video.currentTime = video.currentTime || 0;
            var playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {});
            }
            return;
        }

        // 2. YouTube iframe
        var youtube = activeSlide.querySelector(".js-youtube");
        if (youtube && youtube.contentWindow) {
            youtube.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            return;
        }

        // 3. Vimeo iframe
        var vimeo = activeSlide.querySelector(".js-vimeo");
        if (vimeo && vimeo.contentWindow) {
            vimeo.contentWindow.postMessage('{"method":"play"}', '*');
        }
    }

    main.on("slideChange", function () {
        pauseGalleryMedia(this);
    });

    main.on("slideChangeTransitionEnd", function () {
        playActiveSlideVideo(this);
        if (window.CI360) {
            window.CI360.update();
        }
    });

    // Play if initial slide has a video
    playActiveSlideVideo(main);

    function updateActiveButtonThumbs(type, activeIndex) {
        var btnClass = `.${type}-btn`;
        var dataAttr = `data-${type}`;
        var currentClass = `.tf-product-info-list .value-current${capitalizeFirstLetter(type)}`;
        var selectClass = `.tf-product-info-list .select-current${capitalizeFirstLetter(type)}`;
        $(btnClass).removeClass("active");

        var currentSlide = $(".tf-product-media-main .swiper-slide").eq(activeIndex);
        var currentValue = currentSlide.attr(dataAttr);

        if (currentValue) {
            $(`${btnClass}[${dataAttr}='${currentValue}']`).addClass("active");
            $(currentClass).text(currentValue);
            $(selectClass).text(currentValue);
        }
    }

    function scrollToThumbs(type, value, color) {
        if (!value || !color) return;

        var matchingSlides = $(".tf-product-media-main .swiper-slide").filter(function () {
            return $(this).attr(`data-${type}`) === value && $(this).attr("data-color") === color;
        });

        if (matchingSlides.length > 0) {
            var firstIndex = matchingSlides.first().index();
            main.slideTo(firstIndex, 1000, false);
            thumbs.slideTo(firstIndex, 1000, false);
        } else {
            var fallbackSlides = $(".tf-product-media-main .swiper-slide").filter(function () {
                return $(this).attr(`data-${type}`) === value;
            });

            if (fallbackSlides.length > 0) {
                var fallbackIndex = fallbackSlides.first().index();
                main.slideTo(fallbackIndex, 1000, false);
                thumbs.slideTo(fallbackIndex, 1000, false);
            }
        }
    }

    function setupVariantButtonsThumbs(type) {
        $(`.${type}-btn`).on("click", function () {
            if ($(this).closest(".modal-quick-view").length) return;
            var value = $(this).data(type);
            var color = $(".tf-product-info-list .value-currentColor").text();

            $(`.${type}-btn`).removeClass("active");
            $(this).addClass("active");

            scrollToThumbs(type, value, color);
        });
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    ["color", "size"].forEach((type) => {
        main.on("slideChange", function () {
            updateActiveButtonThumbs(type, this.activeIndex);
        });
        // setupVariantButtonsThumbs(type);
        updateActiveButtonThumbs(type, main.activeIndex);
    });
}

(function ($) {
    "use strict";

    var section_zoom = function () {
        $(".tf-image-zoom").on("mouseover", function () {
            $(this).closest(".section-image-zoom").addClass("zoom-active");
        });
        $(".tf-image-zoom").on("mouseleave", function () {
            $(this).closest(".section-image-zoom").removeClass("zoom-active");
        });
    };
    var cus_zoom = function () {
        var image_zoom = function () {
            var driftAll = document.querySelectorAll(".tf-image-zoom");
            var pane = document.querySelector(".tf-zoom-main");

            if (matchMedia("only screen and (min-width: 1200px)").matches) {
                $(driftAll).each(function (i, el) {
                    if (!el._drift) {
                        el._drift = new Drift(el, {
                            zoomFactor: 2,
                            paneContainer: pane,
                            inlinePane: false,
                            handleTouch: false,
                            hoverBoundingBox: true,
                            containInline: true,
                        });
                    }
                });
            } else {
                $(driftAll).each(function (i, el) {
                    if (el._drift) {
                        el._drift.destroy();
                        el._drift = null;
                    }
                });
            }

            if (typeof $.fn.magnificPopup !== "undefined") {
                $(driftAll).magnificPopup({
                    type: "image",
                    gallery: {
                        enabled: true,
                    },
                    zoom: {
                        enabled: true,
                    },
                });
            }
        };

        window.addEventListener("resize", image_zoom);
        image_zoom();
    };

    var image_zoom_magnifier = function () {
        var driftAll = document.querySelectorAll(".tf-image-zoom-magnifier");
        $(driftAll).each(function (i, el) {
            new Drift(el, {
                zoomFactor: 2,
                inlinePane: true,
                containInline: false,
            });
        });
    };

    var image_zoom_inner = function () {
        var driftAll = document.querySelectorAll(".tf-image-zoom-inner");
        var pane = document.querySelector(".tf-product-zoom-inner");
        $(driftAll).each(function (i, el) {
            new Drift(el, {
                paneContainer: pane,
                zoomFactor: 2,
                inlinePane: false,
                containInline: false,
            });
        });
    };

    var lightboxswiper = function () {
        const lightbox = new PhotoSwipeLightbox({
            gallery: "#gallery-swiper-started",
            children: "a",
            pswpModule: PhotoSwipe,
            bgOpacity: 1,
            secondaryZoomLevel: 2,
            maxZoomLevel: 3,
        });
        lightbox.init();

        lightbox.on("change", () => {
            const { pswp } = lightbox;
            main.slideTo(pswp.currIndex, 0, false);
        });

        lightbox.on("afterInit", () => {
            if (main.params.autoplay.enabled) {
                main.autoplay.stop();
            }
        });

        lightbox.on("closingAnimationStart", () => {
            const { pswp } = lightbox;
            main.slideTo(pswp.currIndex, 0, false);
            if (main.params.autoplay.enabled) {
                main.autoplay.start();
            }
        });
    };

    var lightbox = function () {
        const lightbox = new PhotoSwipeLightbox({
            gallery: "#gallery-started",
            children: "a",
            pswpModule: PhotoSwipe,
            bgOpacity: 1,
            secondaryZoomLevel: 2,
            maxZoomLevel: 3,
        });
        lightbox.init();
    };

    var model_viewer = function () {
        if ($(".tf-model-viewer").length) {
            $(".tf-model-viewer-ui-button").on("click", function (e) {
                $(this).closest(".tf-model-viewer").find("model-viewer").removeClass("disabled");
                $(this).closest(".tf-model-viewer").toggleClass("active");
            });

            $(".tf-model-viewer-ui").on("dblclick", function (e) {
                const modelViewer = $(this).closest(".tf-model-viewer").find("model-viewer")[0];

                $(this).closest(".tf-model-viewer").find("model-viewer").addClass("disabled");
                $(this).closest(".tf-model-viewer").toggleClass("active");

                if (modelViewer) {
                    modelViewer.cameraOrbit = "0deg 90deg auto";
                    // modelViewer.fieldOfView = "45deg";
                    modelViewer.updateFraming();
                }
            });
        }
    };

    // Dom Ready
    $(function () {
        section_zoom();
        cus_zoom();
        image_zoom_magnifier();
        image_zoom_inner();
        lightboxswiper();
        lightbox();
        model_viewer();
    });
})(jQuery);
