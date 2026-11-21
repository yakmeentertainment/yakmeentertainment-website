/* =====================================================================
   YAKME PROJECTS — edit this list to add games, animations and apps.
   section : "games" | "animations" | "apps"   (which page it shows on)
   play    : web address of its own repo, e.g. "/games-my-game/" (leave "" if none)
   apk     : the APK in its repo, e.g. "/games-my-game/my-game.apk"
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
    play: "/games-tony-el-barracho/",
    apk: "",
    shape: "portrait"
  },
  {
    section: "games",
    title: "Shake & Pop",
    blurb: "Shake your phone to build up the fizz, then hit OPEN the moment you stop and watch the soda blast sky-high. Ten levels from an 8 oz bottle to a MEGA 10 liter. On a computer, wiggle the mouse to shake.",
    tags: ["Party", "10 levels", "Best on phone"],
    thumb: "assets/shake-pop-thumb.svg",
    play: "/games-shake-and-pop/",
    apk: "",
    shape: "portrait"
  },
  {
    section: "games",
    title: "Dad Punt",
    blurb: "The kids left their stuffed animals all over the floor again, and Dad has had enough. Pick a stuffie, then swipe up (or shake your phone) to see how far Dad can punt it. Six stuffies with their own physics: a belly-sliding penguin, a chonky panda, a floaty tiny tree, a floppy octopus, a T-Rex and a super bouncy bunny. Clear the hedge and find the trampoline.",
    tags: ["Arcade", "6 stuffies", "Best on phone"],
    thumb: "assets/dad-punt-thumb.jpg",
    play: "/games-dad-punt/",
    apk: "",
    shape: "portrait"
  },
  {
    section: "games",
    title: "Pitmaster: Smoke-Off",
    blurb: "Babysit the smoker all night: add logs, work the vent and keep the temp in the green while raccoons, rain and the nosy neighbors Dillon and Tyler get in your way. Then shake your phone to build up pressure and sauce the meat in the morning, without hitting Uncle Marty's white shirt. Five cooks, from chicken thighs to a whole hog.",
    tags: ["Strategy", "5 cooks", "Best on phone"],
    thumb: "assets/pitmaster-thumb.jpg",
    play: "/games-pitmaster/",
    apk: "",
    shape: "portrait"
  },
  {
    section: "games",
    title: "Brother Brawl",
    blurb: "Four brothers, one house. Pick Pelou (30), Martin (20), Gil (15) or Tony (10) and fight the other three through the living room, the kitchen and the backyard. Every brother has his own special: Pelou's belly flop, Martin's dorm suplex, Gil's surprise wedgie and Tony's \"I'm telling Mom!\". Win with every brother to earn his crown.",
    tags: ["Fighting", "4 brothers", "Best on phone"],
    thumb: "assets/brother-brawl-thumb.jpg",
    play: "/games-brother-brawl/",
    apk: "",
    shape: "portrait"
  },
  {
    section: "games",
    title: "Cabin Life",
    blurb: "You're alone in a cabin by the lake. Chop wood and keep the bonfire going, fish or hunt when you're hungry, and filter and boil lake water before you drink it. Bears raid camp when you least expect it, and when the power goes out you'd better have candles. How many days can you last?",
    tags: ["Survival", "Endless", "Best on phone"],
    thumb: "assets/cabin-life-thumb.svg",
    play: "/games-cabin-life/",
    apk: "",
    shape: "portrait"
  },
  {
    section: "apps",
    title: "Stadium Wayfinder",
    blurb: "Pick a stadium, then get turn-by-turn directions to your section, the closest food and drinks, or a fair spot to meet a friend. 13 venues, including the United Center, Soldier Field, Wrigley, Lambeau, Fenway, MSG and SoFi.",
    tags: ["Navigation", "13 stadiums"],
    thumb: "assets/wayfinder-icon.svg",
    play: "/apps-stadium-wayfinder/",
    apk: "/apps-stadium-wayfinder/stadium-wayfinder.apk",
    shape: "wide"
  }
  // Animations go here too, e.g.
  // { section:"animations", title:"My Animation", blurb:"...", tags:["Short"], thumb:"assets/x.jpg", play:"play/x.html", apk:"", shape:"wide" }
];
