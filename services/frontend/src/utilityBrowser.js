// eslint-disable-next-line no-undef
export const isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === '[object SafariRemoteNotification]' })(!window.safari || (typeof safari !== 'undefined' && safari.pushNotification))
