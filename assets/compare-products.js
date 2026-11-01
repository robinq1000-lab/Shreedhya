"use strict";
document.addEventListener("DOMContentLoaded", () => {
    var compareProducts = {};
    (function () {
        var $this;
        compareProducts = {
            limit: 20,
            compareUrlEl: document.getElementById("compare_url") || null,
            compareBottomBarEl: document.getElementById("compare-product") || null,
            compareModalEl: document.getElementById("compare-products-modal") || null,
            isComparePage: document.querySelector(".empty_compare_products") || null,
            compareCountEl: ".js-product-count",
            overlaySelector: ".compare-model-overlay",
            html: document.documentElement,
            body: document.body,
            enablePopupCompare: document.body.classList.contains("enable-compare-popup") || false,
            init: function () {
                $this = compareProducts;
                if ($this.compareUrlEl == null) return;
                $this.events();
                $this.compareUpdate(false);
                $this.compareUpdate(true);
                const compareProductsStorage = localStorage.getItem("compareProducts") || "";
                const compareCount = compareProductsStorage
                    .split(",")
                    .filter(item => item.trim() !== "")
                    .length;
                if (compareCount > 1 && $this.enablePopupCompare) {
                    setTimeout(() => {
                        $this.openBottomBar(true);
                    }, 300);
                }
            },
			events: function () {
                document.addEventListener("click", (e) => {
                    let target = e.target;
                    // if (target.closest(".js-add-compare-link")) {
                    //     e.preventDefault();
                    //     target = target.closest(".js-add-compare-link");
                    //     const product_id = target.dataset.id;
                    //     $this.addToCompare(product_id);
                    // }
                    if (target.closest(".js-remove-compare-link")) {
                        e.preventDefault();
                        target = target.closest(".js-remove-compare-link");
                        const product_id = target.dataset.id;
                        $this.removeFromCompare(product_id, target);
                    }
                    if (target.closest(".js-compare-clear-all")) {
                        e.preventDefault();
                        target = target.closest(".js-compare-clear-all");

                        $this.removeAll();
                    }
                    // if (target.closest(".compare_added")) {
                    //     e.preventDefault();
                    //     if ($this.enablePopupCompare && null == $this.isComparePage) {
                    //         $this.openBottomBar();
                    //     } else {
                    //         window.location.href = $this.compareUrlEl.href;
                    //     }
                    // }
                    if (
                        target.closest(".js-add-compare-link") ||
                        target.closest(".compare_added")
                    ) {
                        e.preventDefault();

                        target = target.closest("[data-id]");
                        const product_id = target.dataset.id;

                        $this.toggleCompare(product_id);
                        return;
                    }
                    if (target.closest(".close-compare") || target.closest($this.overlaySelector)) {
                        e.preventDefault();
                        $this.closeBottomBar(true);
                    }
                    if (target.closest(".js-compare-modal")) {
                        e.preventDefault();
                        const compareProductsStorage = localStorage.getItem("compareProducts") || "";
                        const compareCount = compareProductsStorage
                            .split(",")
                            .filter(item => item.trim() !== "")
                            .length;
                        if (compareCount > 1) {
                            $this.openModal();
                        }
                    }
                    if (target.closest(".close-compare-modal")) {
                        e.preventDefault();
                        $this.closeModal();
                    }
                    if (
                        target.classList &&
                        target.classList.contains("js-compare-products-modal")
                    ) {
                        e.preventDefault();
                        $this.closeModal();
                    }
                });
            },
			addToCompare: function (product_id) {
                const id = `id:${product_id}`,
                    compareProducts = localStorage.getItem("compareProducts");
                let compareProductsArr = new Array();
                if (compareProducts != null && compareProducts.length > 0) {
                    compareProductsArr = compareProducts.split(",");
                    compareProductsArr.unshift(id);
                } else {
                    compareProductsArr.unshift(id);
                }
                compareProductsArr = compareProductsArr.filter($this.onlyUnique);
                if (compareProductsArr.length > $this.limit) {
                    compareProductsArr = compareProductsArr.splice(0, $this.limit);
                }
                localStorage.setItem("compareProducts", compareProductsArr.toString());
                Array.from(document.querySelectorAll(`.js-add-compare-link[data-id="${product_id}"]`))
                    .forEach(el => { el.classList.remove("js-add-compare-link"), el.classList.add("compare_added") });
                $this.compareUpdate(true);
                $this.openBottomBar(true);
            },
            toggleCompare: function(product_id) {

                const id = `id:${product_id}`;
                let compareProductsArr = [];

                const compareProducts =
                    localStorage.getItem("compareProducts");

                if (compareProducts) {
                    compareProductsArr = compareProducts
                        .split(",")
                        .filter(Boolean);
                }

                if (compareProductsArr.includes(id)) {

                    compareProductsArr = compareProductsArr.filter(
                        item => item !== id
                    );

                } else {

                    compareProductsArr.unshift(id);

                    compareProductsArr =
                        compareProductsArr.filter($this.onlyUnique);

                    if (compareProductsArr.length > $this.limit) {
                        compareProductsArr =
                            compareProductsArr.slice(0, $this.limit);
                    }
                }

                localStorage.setItem(
                    "compareProducts",
                    compareProductsArr.toString()
                );

                document
                    .querySelectorAll(`[data-id="${product_id}"]`)
                    .forEach(el => {
                        el.classList.toggle("compare_added");
                        el.classList.toggle("js-add-compare-link");
                    });

                $this.compareUpdate(true);

                if (
                    compareProductsArr.length > 0 &&
                    $this.enablePopupCompare
                ) {
                    $this.openBottomBar(true);
                }
            },
			removeFromCompare: function (product_id, target) {
                const id = `id:${product_id}`,
                    compareProducts = localStorage.getItem("compareProducts");
                    
                let compareProductsArr = compareProducts.split(","),
                    index = compareProductsArr.indexOf(id);
                if (index > -1) {
                    compareProductsArr = compareProductsArr.splice(0, $this.limit + 1);
                    compareProductsArr.splice(index, 1);
                } else {
                    compareProductsArr = compareProductsArr.splice(0, $this.limit);
                }
                localStorage.setItem("compareProducts", compareProductsArr.toString());
                const compareTable = target.closest(".compare_table") || false;
                if (compareTable !== false) {
                    const removeProduct = compareTable.querySelectorAll(`.compare_id_${product_id}`);
                    if (removeProduct.length > 0) {
                        removeProduct.forEach(el => { el.remove() });
                    }
                } else {
                    target.closest(".grid__item").remove();
                }
                $this.compareUpdate(true);
                Array.from(document.querySelectorAll(`.compare_added[data-id="${product_id}"]`))
                    .forEach(el => {
                        el.classList.remove("compare_added");
                        el.classList.add("js-add-compare-link");
                    });
                if (compareProductsArr.length < 2) {
                    $this.closeModal();
                    $this.closeBottomBar();
                }
                if (compareProductsArr.toString() == "" && !target.classList.contains("compare_remove_item")) {
                    window.location.href = $this.compareUrlEl.href;
                } else if (compareProductsArr.toString() == "") {
                    $this.closeBottomBar();
                }

                if (compareProductsArr.length === 0 || compareProductsArr.toString() === "") {
                    if (!target.classList.contains("compare_remove_item")) {
                        window.location.href = $this.compareUrlEl.href;
                    } else {
                        $this.closeBottomBar();
                        $this.closeModal();
                    }
                } else {

                    if ($this.enablePopupCompare) {
                        $this.openBottomBar();
                    }

                }
            },
			compareUpdate: function (updateUrl, id) {
                if ($this.compareUrlEl == null) return;
                // const compareProducts = localStorage.getItem("compareProducts");
                // if (compareProducts == null) return;

                const compareProducts = localStorage.getItem("compareProducts");

                // No products in compare
                if (!compareProducts || compareProducts.trim() === "") {

                    document.querySelectorAll($this.compareCountEl).forEach(el => {
                        el.innerHTML = 0;
                    });

                    document.querySelectorAll(".js-compare-modal").forEach(button => {
                        button.setAttribute("disabled", "disabled");
                    });

                    return;
                }

                const compareView = $this.compareUrlEl.dataset.get;
                let ids = compareProducts.replace(/id:/g, ""),
                compareProductsArr = ids.split(",");
                document.querySelectorAll(".js-compare-modal").forEach(button => {
                    if (compareProductsArr.length <= 1) {
                        button.setAttribute("disabled", "disabled");
                    } else {
                        button.removeAttribute("disabled");
                    }
                });
                const compareButtonEl = document.querySelector(".js-compare-modal");
                if (compareButtonEl) {
                    if (compareProductsArr.length <= 1) {
                        compareButtonEl.disabled = true;
                    } else {
                        compareButtonEl.disabled = false;
                    }
                }
                if (updateUrl) {
                    let uri = compareProducts.replace(/,/g, ' OR '),
                        res = encodeURI(uri),
                        url = compareView+'?view=compare&type=product&options[unavailable_products]=last&q='+res;
                    $this.compareUrlEl.href = url;
                    if (
                        compareProductsArr.length > 0 &&
                        $this.enablePopupCompare &&
                        $this.compareBottomBarEl &&
                        !$this.compareBottomBarEl.hasAttribute("open")
                    ) {
                        setTimeout(() => {
                            $this.openBottomBar(true);
                        }, 100);
                    }
                    document.querySelectorAll($this.compareCountEl).forEach(el => {
                        el.innerHTML = compareProductsArr.length;
                    });
                    if (document.querySelector(".empty_compare_products") != null && compareProductsArr.length > 0 && compareProducts != "") {
                        window.location.href = url;
                    }
                } else {
                    if (id) {
                        if (compareProductsArr.indexOf(id) > -1) {
                            Array.from(document.querySelectorAll(`.js-add-compare-link[data-id="${item}"]`))
                                .forEach(el => { el.classList.remove("js-add-compare-link"), el.classList.add("compare_added") });
                        }
                        return false;
                    }
                    compareProductsArr.forEach((item) => {
                        Array.from(document.querySelectorAll(`.js-add-compare-link[data-id="${item}"]`))
                            .forEach(el => { el.classList.remove("js-add-compare-link"), el.classList.add("compare_added") });
                    });
                }                
            },
            removeAll: function () {
                localStorage.removeItem("compareProducts");
                document.querySelectorAll(".compare_added").forEach(el => {
                    el.classList.remove("compare_added");
                    el.classList.add("js-add-compare-link");
                });
                document.querySelectorAll(".js-product-count").forEach(el => {
                    el.innerHTML = 0;
                });
                document.querySelectorAll(".js-compare-modal").forEach(button => {
                    button.setAttribute("disabled", "disabled");
                });
                document.querySelectorAll(".compare_table--column[class*='compare_id_']").forEach(el => {
                    el.remove();
                });
                $this.closeModal();
                $this.closeBottomBar();
            },
			openBottomBar: function (isAjax = false) {
                if ($this.compareBottomBarEl == null || !$this.enablePopupCompare) return;
                if (isAjax || $this.compareBottomBarEl.querySelector(".compare-list") == null) {
                    fetch($this.compareUrlEl.href.replace("view=compare", "view=compare_bottom_bar")).then(function(response) {
                        return response.text();
                    }).then(function(compareBottomBarHTML) {
                        if (compareBottomBarHTML.trim() === '') {
                            return;
                        }
                        var parser = new DOMParser();
                        var data = parser.parseFromString(compareBottomBarHTML, "text/html");
                        const compareProductHTML = data.querySelector(".js-compare-products-bottom-bar");
                        if (compareProductHTML) {
                            $this.compareBottomBarEl.innerHTML = compareProductHTML.innerHTML;
                            $this.compareBottomBarEl.setAttribute("open", true);
                        }
                    });
                } else {
                    $this.compareBottomBarEl.setAttribute("open", true);
                }
            },
            closeBottomBar: function(force = false) {
            if ($this.compareBottomBarEl == null || !$this.enablePopupCompare) return;
                const compareProductsStorage = localStorage.getItem("compareProducts") || "";
                const count = compareProductsStorage
                    .split(",")
                    .filter(item => item.trim() !== "")
                    .length;
                if (!force && count > 0) {
                    return;
                }
                $this.compareBottomBarEl.removeAttribute("open");
            },
			openModal: function () {
                if ($this.compareModalEl == null) return;
                fetch($this.compareUrlEl.href).then(function(response) {
                    return response.text();
                }).then(function(compareModalHTML) {
                    if (compareModalHTML.trim() === '') {
                        return;
                    }
                    var parser = new DOMParser();
                    var data = parser.parseFromString(compareModalHTML, "text/html");
                    const compareProductHTML = data.querySelector(".js-compare-products-modal");
                    if (compareProductHTML) {
                        $this.closeBottomBar();
                        $this.compareModalEl.innerHTML = compareProductHTML.innerHTML;
                        $this.compareModalEl.setAttribute("open", true);
                        $this.body.classList.add("scroll-lock");
                        $this.html.classList.add("scroll-lock");
                    }
                });
            },
            closeModal: function() {
                if ($this.compareModalEl == null) return;
                $this.compareModalEl.removeAttribute("open");
                $this.body.classList.remove("scroll-lock");
                $this.html.classList.remove("scroll-lock");
            },
            onlyUnique: function(value, index, self) {
                return self.indexOf(value) === index;
            }
        }
    })();
	compareProducts.init();
    document.addEventListener("shopify:section:load", function () {
		compareProducts.init();
	});
    document.addEventListener("compareProducts:reinit", function() {
        compareProducts.init();
    });
});