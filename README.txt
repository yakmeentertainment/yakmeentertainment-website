YAKME WEBSITE
=============

What's in here
--------------
index.html                        Splash -> ENTER -> home page with three tiles
games.html                        YakMe Games page
animations.html                   YakMe Animations page
apps.html                         YakMe Apps page
assets/projects.js                THE LIST of games, animations and apps (edit this one)
assets/site.css, site.js          Shared look and code for every page
assets/face.webp, skull.webp      Splash images (same as the app splash)
assets/tony-thumb.jpg             Card picture for Tony El Barracho
assets/wayfinder-icon.svg         Card picture for Stadium Wayfinder
play/tony-el-barracho.html        Browser version of the game
play/stadium-wayfinder/          Browser version of Stadium Wayfinder (13 stadiums)
downloads/                        Put your APK files here

Putting it online
-----------------
Upload everything in this folder (keep the folders as they are) to your host.
Any static host works: Netlify (drag and drop the folder), Cloudflare Pages,
GitHub Pages, or the file manager of whoever sold you the domain.
index.html must be at the top level.

Adding an APK when it's ready
-----------------------------
1. Copy the file into downloads/, e.g. downloads/tony-el-barracho.apk
2. Open assets/projects.js and fill in that project's apk line:
     apk: "downloads/tony-el-barracho.apk",
   The button switches from "APK coming soon" to "Download APK" by itself.

Adding a new game, animation or app
-----------------------------------
1. Put its HTML file in play/ and a picture in assets/
2. In assets/projects.js, copy one of the entries and set section to
   "games", "animations" or "apps". It shows up on that page and on
   the home tile automatically.
   shape: "portrait" = phone-shaped (like Tony), "wide" = full width.

Changing the splash
-------------------
CONFIG near the bottom of index.html holds the splash name and timing,
same settings as the app splash. The splash plays once per visit;
going back to Home from another page skips it.

Direct links
------------
yourdomain.com/games.html#play-tony-el-barracho opens the game straight away.
