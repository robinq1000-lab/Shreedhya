var AgeVerificationPopup = class extends HTMLElement {
    constructor() {
        super();
        this.cookieName = this.id;
        this.cookie = Cookies.get(this.cookieName);
        this.classes = {
            activeContent: "age-verification-popup__content--active",
            inactiveContent: "age-verification-popup__content--inactive",
            inactiveDeclineContent: "age-verification-popup__decline-content--inactive",
            activeDeclineContent: "age-verification-popup__decline-content--active"
        };
        this.declineButton = this.querySelector("[data-age-verification-popup-decline-button]");
        this.declineContent = this.querySelector("[data-age-verification-popup-decline-content]");
        this.content = this.querySelector("[data-age-verification-popup-content]");
        this.returnButton = this.querySelector("[data-age-verification-popup-return-button]");
        this.exitButton = this.querySelector("[data-age-verification-popup-exit-button]");
        this.backgroundImage = this.querySelector("[data-background-image]");
        this.mobileBackgroundImage = this.querySelector("[data-mobile-background-image]");

        if (this.cookie) return;

        this.init(); 
    }
    init() {
        this.modal = this;
        if (this.backgroundImage) {
            this.backgroundImage.style.display = "block";
        }
        if (this.mobileBackgroundImage) {
            this.mobileBackgroundImage.style.display = "block";
        }
        this.modal.classList.add('modal--is-active');
        if (this.declineButton) {
            this.declineButton.addEventListener("click", (e) => {
                e.preventDefault();
                this.showDeclineContent();
            });
        }
        if (this.returnButton) {
            this.returnButton.addEventListener("click", (e) => {
                e.preventDefault();
                this.hideDeclineContent();
            });
        }
        if (this.exitButton) {
            this.exitButton.addEventListener("click", (e) => {
                e.preventDefault();
                Cookies.set(this.cookieName, "entered", 30);
                if (this.backgroundImage) {
                    this.backgroundImage.style.display = "none";
                }
                if (this.mobileBackgroundImage) {
                  this.mobileBackgroundImage.style.display = "none";
                }
                this.modal.classList.remove('modal--is-active');
            });
        }
    }
    showDeclineContent() {
        this.declineContent.classList.remove(this.classes.inactiveDeclineContent);
        this.declineContent.classList.add(this.classes.activeDeclineContent);
        this.content.classList.add(this.classes.inactiveContent);
        this.content.classList.remove(this.classes.activeContent);
    }
    hideDeclineContent() {
        this.declineContent.classList.add(this.classes.inactiveDeclineContent);
        this.declineContent.classList.remove(this.classes.activeDeclineContent);
        this.content.classList.remove(this.classes.inactiveContent);
        this.content.classList.add(this.classes.activeContent);
    }
};

class Cookies {
    static get(name) {
      const cookieName = `${encodeURIComponent(name)}=`;
      const cookie = document.cookie;
      let value = null;
  
      const startIndex = cookie.indexOf(cookieName);
      if (startIndex > -1) {
        const endIndex = cookie.indexOf(';', startIndex);
        if (endIndex == -1) {
          endIndex = cookie.length;
        }
        value = decodeURIComponent(
          cookie.substring(startIndex + name.length, endIndex)
        );
      }
      return value;
    }
  
    static set(name, value, expires, path, domain, secure) {
      let cookieText = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
      if (expires instanceof Date) {
        cookieText += `; expires=${expires.toGMTString()}`;
      }
  
      if (path) cookieText += `; path=${path}`;
      if (domain) cookieText += `; domain=${domain}`;
      if (secure) cookieText += `; secure`;
  
      document.cookie = cookieText;
    }
  
    static remove(name, path, domain, secure) {
        Cookies.set(name, '', new Date(0), path, domain, secure);
    }
}

customElements.define("age-verification-popup", AgeVerificationPopup);