// Shrink (or enlarge) Huddle on ONE screen. Made for a computer that shows Huddle as its wallpaper and
// finds it too zoomed in: open Huddle once with ?zoom=70 on the end of the address and that screen keeps
// showing it at 70% from then on. ?zoom=100 (or ?zoom=off) puts it back. Sizes run from 40 to 200.
// It lives in that browser only (never in the database), so other phones, computers and the fridge are
// not affected.

export const ZOOM_KEY = 'huddle-zoom'

// This runs in the page's <head> before anything is drawn (see app/layout.tsx), so a shrunk screen never
// flashes at full size first. It is plain browser code with no imports, kept in one string so the tests run
// exactly what ships. It never throws: the worst case is a normal-sized page.
//
//   - A good ?zoom= in the address is used, and remembered. Signed out? The sign-in page keeps the address you
//     were heading for in its own ?callbackUrl=, so a ?zoom= in there counts too (the size survives signing in).
//   - 100, 100%, off, reset or normal in the address forgets the saved size.
//   - Anything else in the address (a typo, 7, 5000, abc) is ignored, and a saved size stays as it was.
//   - With nothing in the address, the saved size is used.
//   - If the browser will not keep it (private window, blocked storage), the address still works.
export const ZOOM_BOOT = `(function(){
try{
var KEY=${JSON.stringify(ZOOM_KEY)};
function size(text){var m=/^(\\d{2,3})%?$/.exec(String(text).trim());var n=m?Number(m[1]):0;return n>=40&&n<=200?n:0}
var asked=null;
try{
var here=new URLSearchParams(location.search);
asked=here.get('zoom');
if(asked===null&&here.get('callbackUrl'))asked=new URL(here.get('callbackUrl'),location.href).searchParams.get('zoom');
}catch(e){}
var reset=asked!==null&&/^(100%?|off|reset|normal)$/i.test(asked.trim());
var want=asked!==null&&!reset?size(asked):0;
var use=want;
try{
var store=window.localStorage;
if(reset)store.removeItem(KEY);
else if(want)store.setItem(KEY,String(want));
else use=size(store.getItem(KEY)||'');
}catch(e){}
if(use&&use!==100){
var root=document.documentElement,factor=String(use/100);
root.style.zoom=factor;
root.style.setProperty('--zoom',factor);
}
}catch(e){}
})();`
