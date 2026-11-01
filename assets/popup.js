"use strict"; 

document.addEventListener("DOMContentLoaded", () => {
    var adpPopup = {};

    (function () {
        var $this;

        adpPopup = {
            sPrevious: window.scrollY,
            sDirection: "down",

            init: function () {
                $this = adpPopup;
                $this.popupInit();
                $this.setupEvents();
            },

            setupEvents: function () {
                document.addEventListener("click", $this.handleButtonClick);
                document.addEventListener("keyup", $this.handleKeyPress);
                document.addEventListener("click", $this.handleOverlayClick);
            },

            popupInit: function () {
                document.addEventListener("scroll", $this.updateScrollDirection);
            
                var popups = document.querySelectorAll(".popup");
            
                if (popups.length) {
                    popups.forEach($this.setupPopup);
                }
            },
            updateScrollDirection: function () {
                let scrollCurrent = window.scrollY;
            
                $this.sDirection = scrollCurrent > $this.sPrevious ? "down" : "up";
            
                $this.sPrevious = scrollCurrent;
            },
            
            setupPopup: function (popup, index) {
            
                if (!$this.isAllowPopup(popup)) {
                    return;
                }
            
                $this.openTriggerPopup(popup);
            },
            
            handleButtonClick: function (e) {
                const target = e.target;
                if (target.classList.contains("popup-close") || target.closest(".popup-close")) {
                    $this.closePopup(target.closest('.popup'));
                }
                if (target.classList.contains("popup-accept") || target.closest(".popup-accept")) {
                    $this.acceptPopup(target);
                    $this.closePopup(target.closest('.popup'));
                }
            },

            handleKeyPress: function (e) {
                if (e.key === "Escape") {
                    $this.closePopupsByAttribute("data-esc-close");
                }
                if (e.key === "F4") {
                    $this.closePopupsByAttribute("data-f4-close");
                }
            },

            handleOverlayClick: function (e) {
                if (e.target.classList.contains("popup-overlay")) {
                    $this.closePopupsByAttribute("data-overlay-close");
                }
            },

            setScrollDirection: function () {
                let scrollCurrent = window.scrollY;
                $this.sDirection = scrollCurrent > $this.sPrevious ? "down" : "up";
                $this.sPrevious = scrollCurrent;
            },

            closePopupsByAttribute: function (attribute) {
                var closeItems = document.querySelectorAll(`.popup-open[${attribute}="true"]`);
                closeItems.forEach($this.closePopup);
            },

            isAllowPopup: function (popup) {
                let limitDisplay = parseInt(popup.dataset.limitDisplay || 0);
                let limitDisplayCookie = parseInt($this.getCookie("popup-" + popup.dataset.id));
                // let limitNewsletterDisplayCookie = parseInt($this.getCookie("popup-newsletter-" + popup.dataset.id) || 0);
                return !(limitDisplay && limitDisplayCookie && limitDisplayCookie >= limitDisplay);
            },

			openTriggerPopup: function (popup) {
				var trigger = popup.dataset.openTrigger;
			
				if ("delay" === trigger) {
					setTimeout(() => $this.openPopup(popup), popup.dataset.openDelayNumber * 1000);
				}
			
				if ("exit" === trigger) {
					var showExit = true;
					document.addEventListener("mousemove", function (event) {
						var scroll = window.pageYOffset || document.documentElement.scrollTop;
						if (event.pageY - scroll < 7 && showExit) {
							$this.openPopup(popup);
							showExit = false;
						}
					});
				}
			
				if ("scroll" === trigger) {
					var pointScrollType = popup.dataset.openScrollType;
					var pointScrollPosition = parseFloat(popup.dataset.openScrollPosition);
			
					document.addEventListener("scroll", () => {
						const scrollCondition =
							pointScrollType === "px" ? window.scrollY >= pointScrollPosition :
								$this.getScrollPercent() >= pointScrollPosition;
			
						if (scrollCondition) {
							$this.openPopup(popup);
						}
					});
				}
			},
			
			closeTriggerPopup: function (popup) {
			
				var trigger = popup.dataset.closeTrigger;
			
				if ("delay" === trigger) {
					setTimeout(() => $this.closePopup(popup), popup.dataset.closeDelayNumber * 1000);
				}
			
				if ("scroll" === trigger) {
					var pointScrollType = popup.dataset.closeScrollType;
					var pointScrollPosition = parseFloat(popup.dataset.closeScrollPosition);
					var initScrollPx = parseFloat(popup.dataset.initScrollPx);
					var initScrollPercent = parseFloat(popup.dataset.initScrollPercent);
			
					document.addEventListener("scroll", () => {
						const scrollConditionUp =
							pointScrollType === "px" && $this.sDirection === "up" &&
							window.scrollY < initScrollPx - pointScrollPosition;
			
						const scrollConditionDown =
							pointScrollType === "px" && $this.sDirection === "down" &&
							window.scrollY >= initScrollPx + pointScrollPosition;
			
						const scrollConditionPercentUp =
							pointScrollType === "%" && $this.sDirection === "up" &&
							$this.getScrollPercent() < initScrollPercent - pointScrollPosition;
			
						const scrollConditionPercentDown =
							pointScrollType === "%" && $this.sDirection === "down" &&
							$this.getScrollPercent() >= initScrollPercent + pointScrollPosition;
			
						if (scrollConditionUp || scrollConditionDown ||
							scrollConditionPercentUp || scrollConditionPercentDown) {
							$this.closePopup(popup);
						}
					});
				}
			},

			openPopup: function (popup) {
                if (null !== popup.getAttribute("data-body-scroll-disable") &&
                    popup.getAttribute("data-body-scroll-disable") == 'true' && !popup.classList.contains("popup-already-opened")) {
                    document.body.classList.add("popup-scroll-hidden");
                }

                let limit = parseInt($this.getCookie("popup-" + popup.dataset.id) || 0) + 1;

                $this.setCookie("popup-" + popup.dataset.id, limit, {
                    expires: popup.dataset.limitLifetime,
                });

                if (popup.classList.contains("popup-open") ||
                    popup.classList.contains("popup-already-opened")) {
                    return;
                }

                popup.classList.add("popup-open");

                popup.dataset.initScrollPx = window.scrollY;
                popup.dataset.initScrollPercent = $this.getScrollPercent();

                let animation = popup.dataset.openAnimation;

                $this.applyAnimation(popup, animation);

                $this.setupNewsletterActions(popup);

                $this.closeTriggerPopup(popup);
            },

            closePopup: function (popup) {

			 	let animation = popup.dataset.exitAnimation;

                $this.applyAnimation(popup, animation, function() {
			 		popup.classList.add("popup-already-opened");

                    popup.classList.remove("popup-open");
					
			 		document.body.classList.remove("popup-scroll-hidden");
				});
            },

            acceptPopup: function (popup) {
                $this.setCookie("popup-accept-" + popup.dataset.id, 1, {
                    expires: 360,
                });
            },

            setupNewsletterActions: function (popup) {
                const newsletterForm = popup.querySelector("form");
                if (newsletterForm) {
                    newsletterForm.querySelector('input[type="email"]').focus();
                    const submitButton = newsletterForm.querySelector(`button[type="submit"]`);
                    submitButton.addEventListener("click", function(event) {
                        event.preventDefault();
                        newsletterForm.submit();
                    });
                }
            },

            applyAnimation: function (popup, name, callback) { 
                var overlayName = typeof callback === "function" ? "popupExitFade" : "popupOpenFade";
                
                popup.nextSibling !== null ?
                    popup.nextSibling.classList.add("popup-animated", overlayName) : '';

                ["webkitAnimationEnd", "mozAnimationEnd", "MSAnimationEnd", "oanimationend", "animationend"].forEach((event) => {
                    if (popup.nextSibling !== null) {
                    popup.nextSibling.addEventListener(event, function () {
                        this.classList.remove("popup-animated", overlayName);
                    }, { once: true });
                }
                });
                const popupWrap = popup.querySelector(".popup-wrap");
                popupWrap.classList.add("popup-animated", name);
                ["webkitAnimationEnd", "mozAnimationEnd", "MSAnimationEnd", "oanimationend", "animationend"].forEach((event) => {
                    popupWrap.addEventListener(event, function () {
                        this.classList.remove("popup-animated", name);
                        if (typeof callback === "function") {
                            callback();
                        }
                    }, { once: true });
                });
            },
            getCookie: function (name) {
                var matches = document.cookie.match(
                    new RegExp(
                        "(?:^|; )" +
                        name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") +
                        "=([^;]*)"
                    )
                );
                return matches ? decodeURIComponent(matches[1]) : undefined;
            },

            setCookie: function (name, value, options) {
                options = options || {};
                options.path = options.path ?? "/";
            
                if (typeof options.expires === "number" && options.expires > 0) {
                    options.expires = new Date(Date.now() + options.expires * 24 * 60 * 60 * 1000).toUTCString();
                }
            
                value = encodeURIComponent(value);
            
                var updatedCookie = `${name}=${value}`;
            
                for (var [propName, propValue] of Object.entries(options)) {
                    if (typeof propValue !== "boolean") {
                        updatedCookie += `; ${propName}=${propValue}`;
                    } else if (propValue) {
                        updatedCookie += `; ${propName}`;
                    }
                }
            
                document.cookie = updatedCookie;
            },

            getScrollPercent: function () {
                var h = document.documentElement,
                    b = document.body,
                    st = "scrollTop",
                    sh = "scrollHeight";
                return ((h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight)) * 100;
            }

        };
    })();

    adpPopup.init();

    document.addEventListener("shopify:section:load", adpPopup.init);
    document.addEventListener("shopify:section:unload", function () {
        document.body.classList.remove("popup-scroll-hidden");
    });
}); 