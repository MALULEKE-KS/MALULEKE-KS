// lib/motion-features.ts
// Motion's animation engine, loaded on its own after the page has painted (D-063):
// components draw with the light `m` primitive (motion/react-m) and MotionProvider
// hands them these features once this file arrives. domMax, not domAnimation: the
// nav's and the dock's gliding pill use layout animations (layoutId).

import { domMax } from "motion/react";

export default domMax;
