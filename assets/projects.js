/* =====================================================================
   YAKME PROJECTS — edit this list to add games, animations and apps.
   section : "games" | "animations" | "apps"   (which page it shows on)
   play    : path to the HTML version (leave "" if there isn't one)
   apk     : path to the APK, e.g. "downloads/tony-el-barracho.apk"
             leave "" and the button shows "APK coming soon"
   shape   : "portrait" for phone-shaped games, "wide" for full-width
   ===================================================================== */
const PROJECTS = [
  {
    section: "games",
    title: "Tony El Barracho",
    blurb: "Drag Tony around and feed him the drinks before they hit the floor. Ten levels, from The Bar to The Moon to Home Sweet Home. Watch out for the panda.",
    tags: ["Arcade", "10 levels"],
    thumb: "assets/tony-thumb.jpg", thumbTop: true,
    play: "play/tony-el-barracho.html",
    apk: "",
    shape: "portrait"
  },
  {
    section: "games",
    title: "Shake & Pop",
    blurb: "Shake your phone to build up the fizz, then hit OPEN the moment you stop and watch the soda blast sky-high. Ten levels from an 8 oz bottle to a MEGA 10 liter. On a computer, wiggle the mouse to shake.",
    tags: ["Party", "10 levels", "Best on phone"],
    thumb: "assets/shake-pop-thumb.svg",
    play: "play/shake-and-pop.html",
    apk: "",
    shape: "portrait"
  },
  {
    section: "apps",
    title: "Stadium Wayfinder",
    blurb: "Pick a stadium, then get turn-by-turn directions to your section, the closest food and drinks, or a fair spot to meet a friend. 13 venues, including the United Center, Soldier Field, Wrigley, Lambeau, Fenway, MSG and SoFi.",
    tags: ["Navigation", "13 stadiums"],
    thumb: "assets/wayfinder-icon.svg",
    play: "play/stadium-wayfinder/index.html",
    apk: "downloads/stadium-wayfinder.apk",
    shape: "wide"
  }
  // Animations go here too, e.g.
  // { section:"animations", title:"My Animation", blurb:"...", tags:["Short"], thumb:"assets/x.jpg", play:"play/x.html", apk:"", shape:"wide" }
];
