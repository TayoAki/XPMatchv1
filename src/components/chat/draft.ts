"use client";

/**
 * Puts text into the chat composer without sending it, so an "Ask for recommendations"
 * action prepares a draft the traveler sends on purpose. Returns false when no composer
 * is on the page (the caller then sends the message instead).
 */
export function draftMessage(text: string): boolean {
  if (typeof document === "undefined") return false;
  const field = document.querySelector<HTMLTextAreaElement>(".xp-chat textarea");
  if (!field) return false;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  if (setter) setter.call(field, text);
  else field.value = text;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.focus();
  field.setSelectionRange(text.length, text.length);
  return true;
}
