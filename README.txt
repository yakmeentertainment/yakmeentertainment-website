YAKME ENTERTAINMENT WEBSITE  (yakmeentertainment.com)
=========================================================

How it's organized
------------------
This repo (yakmeentertainment.github.io) is the website itself: the splash,
the home page and the Games / Animations / Apps pages.

Every game, app and animation lives in its OWN repo, named by section:
  games-...       e.g. games-shake-and-pop    -> yakmeentertainment.com/games-shake-and-pop/
  apps-...        e.g. apps-stadium-wayfinder -> yakmeentertainment.com/apps-stadium-wayfinder/
  animations-...  (none yet)

Files in this repo
------------------
index.html            Splash (cartoon face + skull) -> ENTER -> home page
games.html            YakMe Games page
animations.html       YakMe Animations page
apps.html             YakMe Apps page
assets/projects.js    THE LIST of games, animations and apps (edit this one)
assets/site.css/.js   Shared look and code for every page
assets/mascot.svg     The animated cartoon face (splash + header logo)
assets/*-thumb.*      Card pictures
CNAME                 Tells GitHub this site is yakmeentertainment.com (don't delete)

Updating a game or app
----------------------
Open its own repo -> Add file -> Upload files -> drag in the changed files
(drag what's INSIDE the folder, not the folder itself) -> Commit changes.
The site updates in a minute or two. Nothing here needs to change.

Adding a new game, app or animation
-----------------------------------
1. Create a new PUBLIC repo named games-<name>, apps-<name> or animations-<name>
   (tick "Add README").
2. Upload its files with index.html at the top level.
3. Settings -> Pages -> Branch: main, / (root) -> Save.
4. Add a card in assets/projects.js here:
     play: "/games-<name>/",
     apk:  "/games-<name>/<name>.apk"   (or "" for "APK coming soon")
5. Add a card picture to assets/.

Adding an APK
-------------
Upload the .apk into that game's/app's own repo, then set its apk line in
assets/projects.js. The button switches from "APK coming soon" to "Download APK".

Seeing changes
--------------
Browsers keep the old files for up to 10 minutes. Open a new tab/window or
press Ctrl+F5 to see changes right away.
