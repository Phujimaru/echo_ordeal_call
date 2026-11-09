export const PATCH_NAME = "ORDEAL CALL";
/* global __ECHO_VERSION__ */
// เลขเต็มจาก desktop/package.json (vite.config.js define) · ป้ายมุมจอใช้แค่ major.minor เหมือนหน้าแรกของโปรแกรม
export const ECHO_VERSION = typeof __ECHO_VERSION__ !== "undefined" ? __ECHO_VERSION__ : "0.0.0";
export const PATCH_VERSION = ECHO_VERSION.split(".").slice(0, 2).join(".");
export const PATCH_LABEL = `${PATCH_NAME} · ${PATCH_VERSION}`;
export const AUTHOR = "Phujim@ru";
