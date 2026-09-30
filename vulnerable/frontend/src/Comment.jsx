import React from "react";
// Educational vulnerable example — do not use in production.
// Raw stored HTML executes ONLY inside an opaque-origin sandbox.
// No allow-same-origin, forms, popups or top navigation; CSP blocks network.
const policy =
  '<meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; script-src &apos;unsafe-inline&apos;; img-src data:; style-src &apos;unsafe-inline&apos;; form-action &apos;none&apos;; base-uri &apos;none&apos;">';
export function Comment({ content }) {
  return (
    <iframe
      title="Unsafe stored comment"
      sandbox="allow-scripts"
      srcDoc={policy + content}
    />
  );
}
