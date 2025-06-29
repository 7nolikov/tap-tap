// src/js/modal.js
import { dom } from "./domCache.js";

/**
 * Controls the display and content of a generic modal dialog.
 */

/**
 * Displays the generic modal with specified content and buttons.
 * @param {string} title - The title of the modal.
 * @param {string} contentHTML - HTML string for the modal's main content.
 * @param {Array<Object>} footerButtonsConfig - Array of button configurations:
 * `{ text: string, class: string, onClick: Function, hideOnClick: boolean }`
 */
export function showModal(title, contentHTML, footerButtonsConfig = []) {
  if (!dom.genericModal || !dom.genericModalPanel) {
    console.error("Modal elements not found in DOM for display.");
    return;
  }
  dom.genericModalTitle.textContent = title;
  dom.genericModalContent.innerHTML = contentHTML;
  dom.genericModalFooter.innerHTML = ""; // Clear previous buttons

  footerButtonsConfig.forEach((btnConfig) => {
    const button = document.createElement("button");
    button.textContent = btnConfig.text;
    button.className = `px-4 py-2 text-sm rounded-md transition-colors ${
      btnConfig.class || "bg-gray-600 hover:bg-gray-500 text-text-primary"
    }`;
    button.onclick = () => {
      btnConfig.onClick?.();
      if (btnConfig.hideOnClick !== false) hideModal();
    };
    dom.genericModalFooter.appendChild(button);
  });

  dom.genericModal.classList.remove("hidden", "opacity-0");
  dom.genericModalPanel.classList.remove("opacity-0", "scale-95");
  dom.genericModalPanel.classList.add("opacity-100", "scale-100");
}

/**
 * Hides the generic modal.
 */
export function hideModal() {
  if (!dom.genericModal || !dom.genericModalPanel) return;

  dom.genericModal.classList.add("opacity-0");
  dom.genericModalPanel.classList.remove("opacity-100", "scale-100");
  dom.genericModalPanel.classList.add("opacity-0", "scale-95");

  setTimeout(() => {
    dom.genericModal.classList.add("hidden");
    dom.genericModalContent.innerHTML = "";
    dom.genericModalFooter.innerHTML = "";
  }, 300); // Match CSS transition duration
}