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
    section: "games",
    title: "Lucky Loon Pull Tabs",
    blurb: "Belly up to the Lucky Loon and buy pull tabs a buck at a time. Peel the tabs and line up three in a row to win, and keep an eye on the flare to see which big winners are still in the box. When you go broke, the bartender spots you a twenty. Play money only.",
    tags: ["Bar game", "Play money", "Best on phone"],
    thumb: "assets/pull-tabs-thumb.svg",
    play: "/games-pull-tabs/",
    apk: "",
    shape: "portrait"
  },
  {
    section: "games",
    title: "Slingshot Showdown",
    blurb: "Pull back the sling and bonk the critters and folks wandering across the field. The farther the target, the bigger the points: 10 up close, 100 way out by the tree line, triple for the golden ones. And a certain cartoon face pops up in the corner to trash-talk every miss.",
    tags: ["Arcade", "60-second rounds", "Best on phone"],
    thumb: "assets/slingshot-thumb.jpg", thumbTop: true,
    play: "/games-slingshot-showdown/",
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
  },
  {
    section: "animations",
    title: "Episode 1: 1, 2, 3",
    blurb: "Tony is seven, and his older brothers Martin and Gil never want to play with him. Until today. A true story and the first episode of the Tony series, shown as an animated storyboard.",
    tags: ["Episode 1", "True story", "Storyboard"],
    thumb: "assets/episode-1-thumb.svg",
    play: "play/episode-1.html",
    apk: "",
    shape: "wide"
  }
  // Animations go here too, e.g.
  // { section:"animations", title:"My Animation", blurb:"...", tags:["Short"], thumb:"assets/x.jpg", play:"play/x.html", apk:"", shape:"wide" }
];
