import React from "react";
// React renders this as text, even if the stored value contains HTML.
export function Comment({ content }) {
  return <p className="comment">{content}</p>;
}
