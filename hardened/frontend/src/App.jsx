import React from "react";
import { Lab } from "../../../shared/frontend/Lab.jsx";
import { Comment } from "./Comment.jsx";
export default function App() {
  return <Lab mode="hardened" Comment={Comment} />;
}
